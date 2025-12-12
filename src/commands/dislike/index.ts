import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { db } from '../../database';

export const data = new SlashCommandBuilder()
    .setName('dislike')
    .setDescription('Remove a favourite menu item')
    .addStringOption((option) =>
        option
            .setName('regex')
            .setDescription('A regular expression to match the menu item you want to remove from favourites')
            .setRequired(true),
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const regex = interaction.options.getString('regex', true);

    // Check if the regex is valid
    try {
        new RegExp(regex);
    } catch (err) {
        await interaction.reply({
            content: 'The provided regular expression is not valid.',
            flags: [MessageFlags.Ephemeral],
        });
        return;
    }

    // Check, if the user has this favourite
    let row;
    try {
        row = await new Promise((resolve, reject) => {
            db.get(
                'SELECT * FROM favorites WHERE user_id = ? AND regex = ?',
                [interaction.user.id, regex],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                },
            );
        });
    } catch (err) {
        console.error(err);
        interaction.reply({
            content: 'An error occurred while checking your favourite.',
            flags: [MessageFlags.Ephemeral],
        });
        return;
    }

    if (!row) {
        await interaction.reply({
            content: 'You do not have this favourite! :cry:',
            flags: [MessageFlags.Ephemeral],
        });
        return;
    }

    try {
        await new Promise((resolve, reject) => {
            db.run('DELETE FROM favorites WHERE user_id = ? AND regex = ?', [interaction.user.id, regex], (err) => {
                if (err) reject(err);
                else resolve(null);
            });
        });
    } catch (err) {
        console.error(err);
        interaction.reply({
            content: 'An error occurred while removing your favourite.',
            flags: [MessageFlags.Ephemeral],
        });
        return;
    }

    await interaction.reply({
        content: 'Successfully removed the favourite! :smiley:',
        flags: [MessageFlags.Ephemeral],
    });
}
