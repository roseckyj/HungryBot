import axios from 'axios';
import parse from 'node-html-parser';
import { winToUtf } from '../utils/winToUtf';
import { Menu, MenuItem, PubDescriptor, PubInfo } from './types';

export async function evaluatePub(pub: PubDescriptor): Promise<Menu | null> {
    try {
        switch (pub.type) {
            case 'menicka': {
                const response = parse(
                    winToUtf
                        .convert(
                            new Buffer(
                                (
                                    await axios.get(`https://www.menicka.cz/${pub.id}.html`, {
                                        responseEncoding: 'binary',
                                    })
                                ).data,
                                'binary',
                            ),
                        )
                        .toString(),
                );

                const menicka = response
                    .querySelectorAll('.menicka')
                    .filter((menu) =>
                        menu
                            .querySelector('.nadpis')
                            ?.text.includes(new Date().toLocaleDateString('cs-CZ').replaceAll(' ', '')),
                    )[0];

                const polevky: MenuItem[] = menicka.querySelectorAll('.polevka').map((polevka) => ({
                    item: polevka.querySelector('.polozka')?.childNodes[0]?.text ?? '',
                    price:
                        parseInt(polevka.querySelector('.cena')?.text.replace(',', '.').replace(' Kč', '') ?? '0') ||
                        null,
                }));

                const jidlo: MenuItem[] = menicka.querySelectorAll('.jidlo').map((jidlo) => ({
                    item: jidlo.querySelector('.polozka')?.childNodes[1]?.text ?? '',
                    price:
                        parseInt(jidlo.querySelector('.cena')?.text.replace(',', '.').replace(' Kč', '') ?? '0') ||
                        null,
                }));

                const pubInfo: PubInfo = {
                    name: response.querySelector('.profile h1')?.text.trim() ?? '',
                    address: response.querySelector('.profile .adresa')?.text.trim() ?? '',
                    website: `https://www.menicka.cz/${pub.id}.html`,
                    image:
                        response
                            .querySelector('.galerie img')
                            ?.getAttribute('src')
                            ?.replace('../', 'https://www.menicka.cz/') ?? '',
                    color: pub.color,
                    icon: pub.icon,
                };

                return {
                    pub: pubInfo,
                    items: [...polevky, ...jidlo].filter((item) => item.item.length > 0),
                };
            }
            case 'wolt': {
                const id = pub.link.split('/').pop();

                const responseAssortment = (
                    await axios.get(
                        `https://consumer-api.wolt.com/consumer-api/consumer-assortment/v1/venues/slug/${id}/assortment`,
                    )
                ).data;

                const responseStatic = (
                    await axios.get(`https://consumer-api.wolt.com/order-xp/web/v1/pages/venue/slug/${id}/static`)
                ).data;

                const item_ids = responseAssortment.categories
                    .filter((category: any) => pub.categories.some((regex) => category.slug.match(regex)))
                    .map((category: any) => category.item_ids)
                    .flat();

                const items = responseAssortment.items
                    .filter((item: any) => item_ids.includes(item.id))
                    .map((item: any) => ({
                        item: item.name + (item.description.length > 0 ? ` - ${item.description}` : ''),
                        price: item.price / 100,
                    }));

                const pubInfo = {
                    name: responseStatic.venue.name,
                    address: responseStatic.venue.address + ', ' + responseStatic.venue.city,
                    website: pub.link,
                    image: responseStatic.venue.image_url,
                    color: pub.color,
                    icon: pub.icon,
                };

                return {
                    pub: pubInfo,
                    items,
                };
            }
            case 'static': {
                return {
                    pub: {
                        name: pub.name,
                        address: '',
                        website: pub.link,
                        image: '',
                        color: pub.color,
                        icon: pub.icon,
                    },
                    items: null,
                };
            }
            case 'function': {
                return await pub.evaluate();
            }
        }
    } catch (error) {
        // console.error(error);
        return null;
    }
}
