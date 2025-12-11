import { APIEmbed } from 'discord.js';
import { evaluatePub } from '../../pubs/evaluatePub';
import { pubs } from '../../pubs/pubs';
import { Menu } from '../../pubs/types';

export async function buildEmbeds(page: number) {
    const menu: Menu[] = (await Promise.all(pubs[page].map(evaluatePub))).filter((x) => x) as Menu[];

    const embeds: APIEmbed[] = menu.map((menu) => ({
        title: menu.pub.icon + ' ' + menu.pub.name,
        // description: menu.pub.address,
        url: menu.pub.website,
        // thumbnail: {
        //     url: menu.pub.image,
        // },
        color: menu.pub.color,
        description: (menu.items && menu.items.length > 0
            ? menu.items
                  .map((item) => `- ${item.item} ${item.price ? ` - *${item.price} Kč*` : ''}`)
                  .filter((x) => x.length > 0)
            : []
        ).join('\n'),
    }));

    return embeds;
}
