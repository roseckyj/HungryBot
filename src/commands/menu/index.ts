import {
    ButtonInteraction,
    ButtonStyle,
    ChatInputCommandInteraction,
    ComponentType,
    MessageContextMenuCommandInteraction,
    PrimaryEntryPointCommandInteraction,
    SlashCommandBuilder,
    UserContextMenuCommandInteraction,
} from 'discord.js';
import { pubs } from '../../pubs/pubs';
import { execute as joinExecute } from '../join/index';
import { buildEmbeds } from './buildEmbeds';

export const data = new SlashCommandBuilder().setName('menu').setDescription("Lists today's menu for pubs near FI");
export async function execute(
    interaction:
        | ChatInputCommandInteraction
        | MessageContextMenuCommandInteraction
        | UserContextMenuCommandInteraction
        | PrimaryEntryPointCommandInteraction
        | ButtonInteraction,
) {
    const pageId = parseInt('customId' in interaction ? interaction.customId.split('_')[2] : '0');

    await interaction.deferReply();

    await interaction.editReply({
        content: pageId === 0 ? `# Menu for ${new Date().toLocaleDateString('cs-CZ')}` : '',
        embeds: await buildEmbeds(pageId),
        components: [
            {
                type: ComponentType.ActionRow,
                components: [
                    {
                        type: ComponentType.Button,
                        style: ButtonStyle.Primary,
                        label: 'Join for lunch',
                        customId: 'join_lunch',
                    },
                    pageId < pubs.length - 1
                        ? {
                              type: ComponentType.Button,
                              style: ButtonStyle.Secondary,
                              label: '+ Show more pubs',
                              customId: `more_pubs_${pageId + 1}`,
                          }
                        : null,
                ].filter((x) => x) as any[],
            },
        ],
    });

    const message = await interaction.fetchReply();

    // When the user clicks on the button, send the extended menu
    const collector = message.createMessageComponentCollector({ time: 1000 * 60 * 60 });
    collector.on('collect', async (sub_interaction: ButtonInteraction) => {
        if (sub_interaction.customId === 'join_lunch') {
            await joinExecute(sub_interaction);
            return;
        } else if (sub_interaction.customId.startsWith('more_pubs_')) {
            await message.edit({ components: [] });
            await execute(sub_interaction);
            return;
        }
    });
}
