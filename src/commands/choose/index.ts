import { APIEmbed, ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { db } from '../../database';
import { evaluatePub } from '../../pubs/evaluatePub';
import { allPubs } from '../../pubs/pubs';
import { Menu } from '../../pubs/types';

export const data = new SlashCommandBuilder()
    .setName('choose')
    .setDescription('Choose the pub based on joined user preferences');

export async function execute(interaction: ChatInputCommandInteraction) {
    // Select all the joined users for today
    let joinedUsers: number[];
    try {
        joinedUsers = await new Promise((resolve, reject) => {
            db.all(
                'SELECT DISTINCT user_id FROM joins WHERE date(date) = date("now") AND server_id = ?',
                [interaction.guildId],
                (err, rows: { user_id: number }[]) => {
                    if (err) reject(err);
                    else resolve(rows.map((row) => row.user_id));
                },
            );
        });
    } catch (err) {
        console.error(err);
        interaction.reply({
            content: 'An error occurred while fetching joined users.',
            flags: [MessageFlags.Ephemeral],
        });
        return;
    }

    if (joinedUsers.length === 0) {
        await interaction.reply({
            content: 'No users have joined for lunch today. :cry:',
        });
        return;
    }

    // Get the preference regexes of the joined users
    let preferences: { [key: number]: string[] } = {};
    try {
        preferences = await new Promise((resolve, reject) => {
            db.all(
                'SELECT user_id, regex FROM favorites WHERE user_id IN (' + joinedUsers.map(() => '?').join(',') + ')',
                joinedUsers,
                (err, rows: { user_id: number; regex: string }[]) => {
                    if (err) reject(err);
                    else {
                        const prefs: { [key: number]: string[] } = {};
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

    interaction.deferReply();

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
    const header = `## Preferences for ${new Date().toLocaleDateString('cs-CZ')}
Joining for lunch: **${joinedUsers.map((userId) => `<@${userId}>`).join(', ')}**\n\n`;

    if (topPubs.length === 0) {
        await interaction.editReply({
            content: `${header}

*Oh no... No pubs matched the preferences today. :cry:*`,
        });
        return;
    }

    const embeds: APIEmbed[] = topPubs.map((menu) => ({
        title: menu.pub.icon + ' ' + menu.pub.name,
        url: menu.pub.website,
        color: menu.pub.color,
        description:
            `**Final score: ${menu.score} ${menu.score === 1 ? 'person' : 'people'}**\n` +
            menu
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
