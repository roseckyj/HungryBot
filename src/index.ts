import axios from 'axios';
import { Client, GatewayIntentBits, REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import { Iconv } from 'iconv';
import parse from 'node-html-parser';
import { forEver } from 'waitasecond';

dotenv.config();

type PubDescriptor =
    | {
          type: 'menicka';
          id: number;
      }
    | {
          type: 'wolt';
          link: string;
          categories: RegExp[];
      };

type PubInfo = {
    name: string;
    address: string;
    website: string;
};

type Menu = {
    pub: PubInfo;
    items: MenuItem[] | null;
};

type MenuItem = {
    item: string;
    price: number | null;
};

const pubs: PubDescriptor[] = [
    {
        type: 'menicka',
        id: 4116, // Padagali
    },
    {
        type: 'menicka',
        id: 2752, // U Dřeváka
    },
    {
        type: 'menicka',
        id: 325, // Divá Bára
    },
    {
        type: 'menicka',
        id: 6695, // U Karla
    },
    {
        type: 'wolt',
        link: 'https://wolt.com/en/cze/brno/restaurant/bistro-bastardo-stefanikova',
        categories: [/tydenni-nabidka.*/],
    },
    {
        type: 'wolt',
        link: 'https://wolt.com/en/cze/brno/restaurant/bistro-pod-schody1',
        categories: [/obedy.*/],
    },
];

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const commands = [
    {
        name: 'menu',
        description: "Lists today's menu for pubs near FI",
    },
];

const winToUtf = Iconv('windows-1250', 'utf-8');

const rest = new REST({ version: '10' }).setToken(TOKEN);

async function evaluatePub(pub: PubDescriptor): Promise<Menu> {
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
                item: polevka.querySelector('.polozka')?.lastChild?.text ?? '',
                price:
                    parseInt(polevka.querySelector('.cena')?.text.replace(',', '.').replace(' Kč', '') ?? '0') || null,
            }));

            const jidlo: MenuItem[] = menicka.querySelectorAll('.jidlo').map((jidlo) => ({
                item: jidlo.querySelector('.polozka')?.lastChild?.text ?? '',
                price: parseInt(jidlo.querySelector('.cena')?.text.replace(',', '.').replace(' Kč', '') ?? '0') || null,
            }));

            const pubInfo: PubInfo = {
                name: response.querySelector('.profile h1')?.text.trim() ?? '',
                address: response.querySelector('.profile .adresa')?.text.trim() ?? '',
                website: `https://www.menicka.cz/${pub.id}.html`,
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
            };

            return {
                pub: pubInfo,
                items,
            };
        }
    }
}

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }

    const client = new Client({ intents: [GatewayIntentBits.Guilds] });

    client.on('ready', () => {
        console.log(`Logged in as ${client.user!.tag}!`);
    });

    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isChatInputCommand()) return;

        if (interaction.commandName === 'menu') {
            const menu: Menu[] = (await Promise.all(pubs.map(evaluatePub))).filter((x) => x) as Menu[];

            const embeds = menu.map((menu) => ({
                title: menu.pub.name,
                description: menu.pub.address,
                url: menu.pub.website,
                fields:
                    menu.items && menu.items.length > 0
                        ? menu.items.map((item) => ({
                              name: item.item,
                              value: item.price ? `${item.price} Kč` : '',
                          }))
                        : [{ name: 'Menu není k dispozici', value: '' }],
            }));

            await interaction.reply({ embeds });
        }
    });

    client.login(TOKEN);

    await forEver();
})();
