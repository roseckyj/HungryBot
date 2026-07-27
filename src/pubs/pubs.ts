import axios from 'axios';
import parse from 'node-html-parser';
import { Menu, PubDescriptor } from './types';

export const allPubs: PubDescriptor[] = [
    {
        type: 'menicka',
        id: 4116, // Padagali,
        color: 0xf15850,
        icon: '🍛',
    },
    {
        type: 'wolt',
        link: 'https://wolt.com/en/cze/brno/restaurant/bistro-bastardo-stefanikova',
        categories: [/tydenni.*/],
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
    {
        type: 'function',
        link: 'https://www.taorestaurant.cz/tydenni_menu/nabidka/',
        name: 'Táo Viet Nam',
        color: 0x66ad2d,
        icon: '🍜',
        evaluate: async () => {
            const response = parse(
                (
                    await axios.get('https://www.taorestaurant.cz/tydenni_menu/nabidka/', {
                        responseEncoding: 'utf-8',
                    })
                ).data,
            );

            // Get all .tydenni-menu-text elements
            let menu = response.querySelectorAll('.tydenni-menu-text');

            // Some of the items start with a number and some with a weekday (Pondělí - Pátek) - we want all numbers, but only the matching weekday
            const weekday = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek'][new Date().getDay() - 1].toLowerCase();
            menu = menu.filter(
                (item) =>
                    (item.text.toLowerCase().includes(weekday) || item.text.match(/^\d/)) && item.text.length > 20,
            );

            return {
                items: menu.map((item) => {
                    const text = item.text.trim();
                    // Use regex to find the price at the end
                    const priceMatch = text.match(/((\d\s*)+\s*[Kk][Ččc])/);
                    if (priceMatch) {
                        const priceStr = priceMatch[1];
                        const price = parseInt(priceStr.replace(/[Kk][Ččc]/, '').trim());
                        return {
                            item: text.replace(priceStr, '').trim(),
                            price: price,
                        };
                    }
                    return {
                        item: text,
                        price: null,
                    };
                }),
                pub: {
                    name: 'Táo Viet Nam',
                    address: 'Hrnčířská 885/5, 602 00 Brno-střed-Veveří',
                    color: 0x66ad2d,
                    icon: '🍜',
                    website: 'https://www.taorestaurant.cz/tydenni_menu/nabidka/',
                },
            } as Menu;
        },
    },
    {
        type: 'menicka',
        id: 9964, // Pod Schody,
        color: 0xffcc70,
        icon: '🥞',
    },
    {
        type: 'lepsimenu',
        id: 'caruso-pizza',
        color: 0xffffff,
        icon: '🍝',
    },
    {
        type: 'lepsimenu',
        id: 'marmite-cafe',
        color: 0x0e0500,
        icon: '☕',
    },
    {
        type: 'lepsimenu',
        id: 'fresh-menu',
        color: 0x79b741,
        icon: '🌿',
    },
    {
        type: 'menicka',
        id: 9363, // Na Botance,
        color: 0x1c5c95,
        icon: '🌼',
    },
    {
        type: 'menicka',
        id: 5448, // Light of India,
        color: 0xd49257,
        icon: '💡',
    },
    {
        type: 'wolt',
        link: 'https://wolt.com/cs/cze/brno/restaurant/pelmeka',
        categories: [/.*denni.*/],
        color: 0x01b1e0,
        icon: '🥟',
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
        link: 'https://zobrno.cz/',
        name: 'Zô Brno',
        color: 0xfef8da,
        icon: '🍣',
    },
    {
        type: 'wolt',
        link: 'https://www.foodora.cz/restaurant/z0gp/ni-hao',
        categories: [],
        color: 0x0dc68b,
        icon: '🥢',
    },
];

const pageSize = 5;
export const pubs: PubDescriptor[][] = new Array(Math.ceil(allPubs.length / pageSize))
    .fill(0)
    .map((_, i) => allPubs.slice(i * pageSize, (i + 1) * pageSize));
