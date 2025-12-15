import { APIEmbed, ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { db } from '../../database';
import { evaluatePub } from '../../pubs/evaluatePub';
import { allPubs } from '../../pubs/pubs';
import { Menu } from '../../pubs/types';

export const data = new SlashCommandBuilder().setName('forme').setDescription("Show my preferences from today's menu");

export async function execute(interaction: ChatInputCommandInteraction) {
    // Get the preference regexes of the current user
    const joinedUsers = [interaction.user.id];

    let preferences: { [key: string]: string[] } = {};
    try {
        preferences = await new Promise((resolve, reject) => {
            db.all(
                'SELECT user_id, regex FROM favorites WHERE user_id IN (' + joinedUsers.map(() => '?').join(',') + ')',
                joinedUsers,
                (err, rows: { user_id: string; regex: string }[]) => {
                    if (err) reject(err);
                    else {
                        const prefs: { [key: string]: string[] } = {};
                        for (const row of rows) {
                            if (!prefs[row.user_id]) prefs[row.user_id] = [];
                            prefs[row.user_id].push(row.regex);
                        }
                        resolve(prefs);
                    }
                },
            );
        });
    } catch (err) {
        console.error(err);
        interaction.reply({
            content: 'An error occurred while fetching user preferences.',
            flags: [MessageFlags.Ephemeral],
        });
        return;
    }

    interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    // Get menus of all the pubs
    const menu: Menu[] = (await Promise.all(allPubs.map(evaluatePub))).filter((x) => x) as Menu[];

    // For each menu item (food) add the list of users who would like it
    const withPreferences = menu
        .map((menu) => ({
            ...menu,
            items: menu.items
                ?.map((item) => ({
                    ...item,
                    likedBy: joinedUsers.filter((userId) =>
                        preferences[userId]?.some((regex) => new RegExp(regex, 'i').test(item.item)),
                    ),
                }))
                ?.filter((item) => item.likedBy.length > 0),
        }))
        .filter((menu) => menu.items && menu.items.length > 0);

    // Score each pub by the number of users with at least one liked item
    const withScore = withPreferences.map((menu) => ({
        ...menu,
        score: joinedUsers
            .map((userId) => (menu.items?.some((item) => item.likedBy.includes(userId)) ? 1 : 0))
            .reduce((a, b) => a + b, 0 as number),
    }));

    // Sort by score descending
    withScore.sort((a, b) => b.score - a.score);

    // Sort items in each menu by the number of users liking them descending
    withScore.forEach((menu) => {
        menu.items!.sort((a, b) => b.likedBy.length - a.likedBy.length);
    });

    // Choose max 5 pubs
    const topPubs = withScore.slice(0, 5);

    // Build the reply message
    const header = `## Your preferences for ${new Date().toLocaleDateString('cs-CZ')}\n`;

    if (topPubs.length === 0) {
        await interaction.editReply({
            content: `${header}

*Oh no... No pubs matched your preferences today. :cry:*`,
        });
        return;
    }

    const embeds: APIEmbed[] = topPubs.map((menu) => ({
        title: menu.pub.icon + ' ' + menu.pub.name,
        url: menu.pub.website,
        color: menu.pub.color,
        description: menu
            .items!.map(
                (item) =>
                    `- (${item.likedBy.map((userId) => `<@${userId}>`).join(', ')}) ${item.item} ${
                        item.price ? ` - *${item.price} Kč*` : ''
                    }`,
            )
            .filter((x) => x.length > 0)
            .join('\n'),
    }));

    interaction.editReply({
        content: header,
        embeds,
    });
}
