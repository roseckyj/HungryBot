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
        type: 'wolt',
        link: 'https://wolt.com/cs/cze/brno/restaurant/pelmeka',
        categories: [],
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
    // {
    //     type: 'function',
    //     link: 'https://www.carusorestaurant.cz/denni-obedove-menu/',
    //     name: 'Caruso',
    //     color: 0xffffff,
    //     icon: '🍝',
    //     evaluate: async () => {
    //         const response = parse(
    //             (
    //                 await axios.get('https://www.carusorestaurant.cz/denni-obedove-menu/', {
    //                     responseEncoding: 'utf-8',
    //                 })
    //             ).data,
    //         );

    //         // Vytáhni všechny .vc_tta-panel elementy
    //         let menu = response.querySelectorAll('.vc_tta-panel');

    //         // Pro každý koukni do headingu a vem jen ten, který má aktuální den v týdnu
    //         const weekday = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek'][new Date().getDay() - 1].toLowerCase();
    //         menu = menu.filter((item) =>
    //             item.querySelector('.vc_tta-title-text')?.text.toLowerCase().includes(weekday),
    //         );

    //         if (menu.length === 0) return null;

    //         // Najdi všechny .wpb_row elementy a z nich vytáhni jídlo a cenu (každé obalené v paragrafu)
    //         menu = menu[0].querySelectorAll('.wpb_row');

    //         return {
    //             items: menu
    //                 .map((item) => {
    //                     const text = item.querySelectorAll('p').map((p) => p.text);
    //                     if (text.length < 2) return null;

    //                     // Find nearest previus .wpb_text_column element
    //                     let heading: HTMLElement | null = item;
    //                     while (heading && !heading.querySelector('h3')) {
    //                         heading = heading.previousElementSibling;
    //                     }
    //                     let headingstr = '';
    //                     if (heading) headingstr = heading.querySelector('h3')?.text ?? '';

    //                     const price = text.pop();
    //                     return {
    //                         item: `${text[0]} (${headingstr})`,
    //                         price: price ? parseInt(price.replace('Kč', '').trim()) : null,
    //                     };
    //                 })
    //                 .filter((x) => x),
    //             pub: {
    //                 name: 'Caruso',
    //                 address: 'Kounicova 22, 602 00 Brno-střed-Veveří',
    //                 color: 0xffffff,
    //                 icon: '🍝',
    //                 website: 'https://www.carusorestaurant.cz/denni-obedove-menu/',
    //             },
    //         } as Menu;
    //     },
    // },
    {
        type: 'static',
        link: 'https://carusofood.cz/denni-menu',
        name: 'Caruso',
        color: 0xffffff,
        icon: '🍝',
    },
    {
        type: 'static',
        link: 'https://www.facebook.com/hostinecpodschody',
        name: 'Hostinec pod Schody',
        color: 0xffcc70,
        icon: '🥞',
    },
    // {
    //     type: 'static',
    //     link: 'http://www.fresh-menu.cz/#menu',
    //     name: 'Fresh Menu',
    //     color: 0x79b741,
    //     icon: '🌿',
    // },
    // {
    //     type: 'menicka',
    //     id: 9363, // Na Botance,
    //     color: 0x1c5c95,
    //     icon: '🌼',
    // },
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
