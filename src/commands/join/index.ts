import { ButtonInteraction, ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { db } from '../../database';

export const data = new SlashCommandBuilder().setName('join').setDescription('Join for lunch today');

export async function execute(interaction: ChatInputCommandInteraction | ButtonInteraction) {
    // Check, if the user has already joined today
    let row;
    try {
        row = await new Promise((resolve, reject) => {
            db.get(
                'SELECT * FROM joins WHERE user_id = ? AND date(date) = date("now") AND server_id = ?',
                [interaction.user.id, interaction.guildId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                },
            );
        });
    } catch (err) {
        console.error(err);
        interaction.reply({
            content: 'An error occurred while checking your join status.',
            flags: [MessageFlags.Ephemeral],
        });
        return;
    }

    if (row) {
        await interaction.reply({
            content: 'You have already joined for lunch today! :smiley:',
            flags: [MessageFlags.Ephemeral],
        });
        return;
    }

    try {
        await new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO joins (user_id, server_id) VALUES (?, ?)',
                [interaction.user.id, interaction.guildId],
                (err) => {
                    if (err) reject(err);
                    else resolve(null);
                },
            );
        });
    } catch (err) {
        console.error(err);
        interaction.reply({
            content: 'An error occurred while joining for lunch.',
            flags: [MessageFlags.Ephemeral],
        });
        return;
    }

    await interaction.reply({
        content: `*${interaction.user.username} wants to join for lunch today! :tada:*`,
    });
}
