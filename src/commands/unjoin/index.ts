import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { db } from '../../database';

export const data = new SlashCommandBuilder().setName('unjoin').setDescription('Revert your join choice for today');

export async function execute(interaction: ChatInputCommandInteraction) {
    // Check, if the user has already joined today
    let row;
    try {
        row = await new Promise((resolve, reject) => {
            db.get(
                'SELECT * FROM joins WHERE user_id = ? AND date(date) = date("now")',
                [interaction.user.id],
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

    if (!row) {
        await interaction.reply({
            content: 'You have not joined for lunch today! :thinking:',
            flags: [MessageFlags.Ephemeral],
        });
        return;
    }

    try {
        await new Promise((resolve, reject) => {
            db.run(
                'DELETE FROM joins WHERE user_id = ? AND date(date) = date("now") AND server_id = ?',
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
        content: `*${interaction.user.username} does not want to join for lunch anymore. :cry:*`,
    });
}
