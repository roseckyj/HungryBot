import { Client, GatewayIntentBits, MessageFlags, REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { db } from './database';

dotenv.config();

const TOKEN = process.env.TOKEN!;
const CLIENT_ID = process.env.CLIENT_ID!;

db;

const commands: {
    data: { name: string; description: string };
    execute: (interaction: any) => Promise<void>;
}[] = [];

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter((file) => file === 'index.js' || file === 'index.ts');
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        // Set a new item in the Collection with the key as the command name and the value as the exported module
        if ('data' in command && 'execute' in command) {
            commands.push({
                data: command.data.toJSON() as {
                    name: string;
                    description: string;
                },
                execute: command.execute as (interaction: any) => Promise<void>,
            });
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

console.log(`Loaded ${commands.length} commands:`);
commands.forEach((cmd) => console.log(`- ${cmd.data.name}`));

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log('Reloading application (/) commands.');
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands.map((c) => c.data) });
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }

    const client = new Client({ intents: [GatewayIntentBits.Guilds] });

    client.once('clientReady', () => {
        console.log(`Logged in as ${client.user!.tag}!`);
    });

    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isChatInputCommand()) return;

        const command = commands.find((c) => c.data.name === interaction.commandName);
        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }
        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: 'There was an error while executing this command!',
                    flags: MessageFlags.Ephemeral,
                });
            } else {
                await interaction.reply({
                    content: 'There was an error while executing this command!',
                    flags: MessageFlags.Ephemeral,
                });
            }
        }
    });

    client.login(TOKEN);
})();
