import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { db } from '../../database';

export const data = new SlashCommandBuilder().setName('liked').setDescription('List your liked menu items');

export async function execute(interaction: ChatInputCommandInteraction) {
    // Fetch the user's favourites
    let rows: { regex: string }[];
    try {
        rows = await new Promise((resolve, reject) => {
            db.all('SELECT regex FROM favorites WHERE user_id = ?', [interaction.user.id], (err, rows) => {
                if (err) reject(err);
                else resolve(rows as { regex: string }[]);
            });
        });
    } catch (err) {
        console.error(err);
        interaction.reply({
            content: 'An error occurred while fetching your favourites.',
            flags: [MessageFlags.Ephemeral],
        });
        return;
    }

    if (rows.length === 0) {
        await interaction.reply({
            content: 'You have no favourite menu items. Use the /like command to add some! :cry:',
            flags: [MessageFlags.Ephemeral],
        });
        return;
    }

    const favouritesList = rows.map((row) => `- \`${row.regex}\``).join('\n');

    await interaction.reply({
        content: `Your favourite menu items are:\n${favouritesList}`,
        flags: [MessageFlags.Ephemeral],
    });
}
