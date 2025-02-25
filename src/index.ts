import axios from 'axios';
import { ButtonStyle, Client, CollectorFilter, ComponentType, GatewayIntentBits, REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import { Iconv } from 'iconv';
import parse from 'node-html-parser';

dotenv.config();

type PubDescriptor =
    | {
          type: 'menicka';
          id: number;
          color: number;
          icon: string;
      }
    | {
          type: 'wolt';
          link: string;
          categories: RegExp[];
          color: number;
          icon: string;
      }
    | {
          type: 'static';
          link: string;
          name: string;
          color: number;
          icon: string;
      };

type PubInfo = {
    name: string;
    address: string;
    website: string;
    image: string;
    color: number;
    icon: string;
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
        id: 4116, // Padagali,
        color: 0xf15850,
        icon: '🍛',
    },
    {
        type: 'wolt',
        link: 'https://wolt.com/en/cze/brno/restaurant/bistro-bastardo-stefanikova',
        categories: [/tydenni-nabidka.*/],
        color: 0x5a5045,
        icon: '🌮',
    },
    {
        type: 'menicka',
        id: 2752, // U Dřeváka,
        color: 0x7c1c14,
        icon: '🍔',
    },
    {
        type: 'menicka',
        id: 6695, // U Karla,
        color: 0xffffff,
        icon: '🍗',
    },
];

const pubsExtended: PubDescriptor[] = [
    {
        type: 'static',
        link: 'https://www.facebook.com/profile.php?id=100094367065084',
        name: 'Bistro pod Schody',
        color: 0xffcc70,
        icon: '🥞',
    },
    {
        type: 'static',
        link: 'https://www.taorestaurant.cz/tydenni_menu/nabidka/',
        name: 'Táo Viet Nam',
        color: 0x66ad2d,
        icon: '🍜',
    },
    {
        type: 'static',
        link: 'https://zobrno.cz/',
        name: 'Zô Brno',
        color: 0xfef8da,
        icon: '🍣',
    },
    {
        type: 'static',
        link: 'https://www.di-napoli.cz/',
        name: 'Bistro Di Napoli',
        color: 0x009614,
        icon: '🍕',
    },
    {
        type: 'static',
        link: 'https://www.carusorestaurant.cz/denni-obedove-menu/',
        name: 'Caruso',
        color: 0xffffff,
        icon: '🍝',
    },
];

const TOKEN = process.env.TOKEN!;
const CLIENT_ID = process.env.CLIENT_ID!;

const commands = [
    {
        name: 'menu',
        description: "Lists today's menu for pubs near FI",
    },
];

const winToUtf = Iconv('windows-1250', 'utf-8');

const rest = new REST({ version: '10' }).setToken(TOKEN);

async function evaluatePub(pub: PubDescriptor): Promise<Menu | null> {
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
                    item: polevka.querySelector('.polozka')?.lastChild?.text ?? '',
                    price:
                        parseInt(polevka.querySelector('.cena')?.text.replace(',', '.').replace(' Kč', '') ?? '0') ||
                        null,
                }));

                const jidlo: MenuItem[] = menicka.querySelectorAll('.jidlo').map((jidlo) => ({
                    item: jidlo.querySelector('.polozka')?.lastChild?.text ?? '',
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
        }
    } catch (error) {
        console.error(error);
        return null;
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
                title: menu.pub.icon + ' ' + menu.pub.name,
                // description: menu.pub.address,
                url: menu.pub.website,
                // thumbnail: {
                //     url: menu.pub.image,
                // },
                color: menu.pub.color,
                fields:
                    menu.items && menu.items.length > 0
                        ? menu.items.map((item) => ({
                              value: `${item.item} ${item.price ? ` - *${item.price} Kč*` : ''}`,
                              name: /*item.price ? `${item.price} Kč` :*/ '',
                          }))
                        : undefined,
            }));

            await interaction.reply({
                embeds,
                components: [
                    {
                        type: ComponentType.ActionRow,
                        components: [
                            {
                                type: ComponentType.Button,
                                style: ButtonStyle.Secondary,
                                label: '+ Show more pubs',
                                customId: 'more_pubs',
                            },
                        ],
                    },
                ],
            });

            const message = await interaction.fetchReply();

            // When the user clicks on the button, send the extended menu
            const filter: CollectorFilter<any> = (interaction) => interaction.customId === 'more_pubs';
            const collector = message.createMessageComponentCollector({ filter, time: 1000 * 60 * 60 });

            collector.on('collect', async (interaction) => {
                const menuExtended: Menu[] = (await Promise.all(pubsExtended.map(evaluatePub))).filter(
                    (x) => x,
                ) as Menu[];

                const embedsExtended = menuExtended.map((menu) => ({
                    title: menu.pub.icon + ' ' + menu.pub.name,
                    // description: menu.pub.address,
                    url: menu.pub.website,
                    // thumbnail: {
                    //     url: menu.pub.image,
                    // },
                    color: menu.pub.color,
                    fields:
                        menu.items && menu.items.length > 0
                            ? menu.items.map((item) => ({
                                  value: `${item.item} ${item.price ? ` - *${item.price} Kč*` : ''}`,
                                  name: /*item.price ? `${item.price} Kč` :*/ '',
                              }))
                            : undefined,
                }));

                await interaction.update({ embeds: [...embeds, ...embedsExtended], components: [] });

                collector.stop();

                // Add reactions to the message with the icons of the pubs
                for (let i = 0; i < menuExtended.length; i++) {
                    await message.react(pubsExtended[i].icon);
                }
            });

            // Add reactions to the message with the icons of the pubs
            for (let i = 0; i < menu.length; i++) {
                await message.react(pubs[i].icon);
            }
        }
    });

    client.login(TOKEN);
})();
