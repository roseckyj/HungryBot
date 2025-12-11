import { Client, GatewayIntentBits, REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import { menuCommand } from './commands/menuCommand';

dotenv.config();

const TOKEN = process.env.TOKEN!;
const CLIENT_ID = process.env.CLIENT_ID!;

const commands = [
    {
        name: 'menu',
        description: "Lists today's menu for pubs near FI",
    },
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }

    const client = new Client({ intents: [GatewayIntentBits.Guilds] });

    client.on('ready', () => {
        console.log(`Logged in as ${client.user!.tag}!`);
    });

    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isChatInputCommand()) return;

        switch (interaction.commandName) {
            case 'menu':
                await menuCommand(interaction);
                break;
        }
    });

    client.login(TOKEN);
})();
