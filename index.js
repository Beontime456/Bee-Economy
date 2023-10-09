// Require the necessary classes for the bot to function
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const { token } = require('./config.json');
const { Sequelize } = require('sequelize');
const Canvas = require('@napi-rs/canvas');

// Create a new client instance
const client = new Client({ intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    ] });

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    // Set a new item in the Collection with the key as the command name and the value as the exported module
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    }
    else {
        console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
}

// Define the sequelize database for easy connection and access
const sequelize = new Sequelize('database', 'user', 'password', {
    host: 'localhost',
    dialect: 'sqlite',
    logging: false,
    storage: 'playerinfo.sqlite',
});

// Sync required tables for creation and access of data
const beelist = require('./models/beelist.js')(sequelize, Sequelize.DataTypes);
const items = require('./models/items.js')(sequelize, Sequelize.DataTypes);
const area = require('./models/area.js')(sequelize, Sequelize.DataTypes);
const inventory = require('./models/inventory.js')(sequelize, Sequelize.DataTypes);
const playerinformation = require('./models/playerinformation.js')(sequelize, Sequelize.DataTypes);
const playerbees = require('./models/playerbees.js')(sequelize, Sequelize.DataTypes);
const quests = require('./models/quests.js')(sequelize, Sequelize.DataTypes);
const giftbox = require('./models/claimbox.js')(sequelize, Sequelize.DataTypes);
const recipes = require('./models/recipes.js')(sequelize, Sequelize.DataTypes);
playerinformation.sync();
playerbees.sync();
beelist.sync();
items.sync();
inventory.sync();
area.sync();
quests.sync();
giftbox.sync();
recipes.sync();

// Initialise a prefix for the bot to see message commands
const prefix = 'bee ';

// Some basic universal functions and variahbles to be used for several commands.
function capitaliseWords(sentence) {
    return sentence.replace(/\b\w/g, char => char.toUpperCase());
}
function beeFact() {
    const beeFacts = ['Bumble bees are apart of the apidae bee family.', 'The average bumble bee life span is 4 weeks.', 'The majority of bumble bee species in Europe seemingly like the colours violet or blue.',
    'A honey bee can fly up to 15 miles per hour.', 'Bees are relatives of ants!', 'Male drone bees don\'t have a stinger.', 'Bees have 5 eyes.', 'Bees struggle distinguishing red colours compared to bluer tones.',
    'Worker bees communicate with dancing or shaking their bodies.', 'A bee flaps it\'s wings 200x per second.', 'Bees can experience PTSD-like symptoms.', 'Bees recognize different human faces.',
    'Bees like humans who take care of them!', 'Bees are usually optimistic when successfully foraging, but can become depressed if momentarily trapped by a predatory spider.',
    'The Megachilidae Bee family has the most diverse nesting habits. They construct hives using mud, gravel, resin, plant fiber, wood pulp, and leaf pulp.', 'The Megachilidae bee family builds their nests in cavities, mainly in rotting wood, using leaves.',
    'The Andrenidae bee family is collectively known as mining bees. It consists of solitary bees that nest on the ground!'];
    const randomFact = Math.floor(Math.random() * 20);
    return beeFacts[randomFact];
}
async function findBeeCommand(beeGrade, beeArea) {
    const findableBees = await beelist.findAll({ where: { findType: beeArea, beeGrade: beeGrade } });
    return findableBees[Math.floor(Math.random() * findableBees.length)];
}
const gradeMultipliers = {
    'F': 0.75,
    'E': 0.85,
    'D': 1,
    'C': 1.1,
    'B': 1.3,
    'A': 1.5,
    'S': 1.75,
    'SS': 2,
};
const areaMap = {
    1: [265, 135],
    2: [205, 125],
    3: [285, 105],
    4: [180, 50],
};


// When the client is ready, run this code (only once)
// We use 'c' for the event parameter to keep it separate from the already defined 'client'
client.once(Events.ClientReady, c => {
	console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
    const now = Date.now;
    const findplayer = await playerinformation.findOne({ where: { playerid: interaction.user.id } });

    if (findplayer != null) {
        const lastCommandTime = findplayer.get('lastEnergyRegen');
        if (lastCommandTime === null) {
            findplayer.update({ lastEnergyRegen: now });
        }
        else {
            const timeDiff = (now - lastCommandTime) / 1000 / 60;
            const energyGained = Math.floor(timeDiff / 5);
            if (energyGained >= 1) {
                let newEnergy = findplayer.get('energy') + energyGained;
                if (newEnergy > 200) {
                    newEnergy = 200;
                }
                findplayer.update({ energy: newEnergy, lastEnergyRegen: now });
            }
        }
    }
    if (interaction.isAutocomplete()) {
        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        if (!command.autocomplete) return console.error(`No autocomplete handler was found for the ${interaction.commandName} command.`);

        try {
            await command.autocomplete(interaction);
        }
        catch (error) {
            console.error(error);
        }
    }
    if (interaction.isChatInputCommand()) {
        const command = await interaction.client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            await command.execute(interaction);
        }
        catch (error) {
            console.error(error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
            }
            else {
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
            }
        }
    }
});

// When the bot sees a message, it will analyse it for a prefix or if the sender is a bot.
// If the keyword after the prefix is a word in a command it will execute that specific command.
client.on('messageCreate', async (message) => {
	if (!message.content.toLowerCase().startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).split(/\s+/);
    const command = args.shift().toLowerCase();

    const now = Date.now();
    const findplayer = await playerinformation.findOne({ where: { playerid: message.author.id } });
    if (findplayer != null) {
        const lastCommandTime = findplayer.get('lastEnergyRegen');
        if (lastCommandTime === null) {
            findplayer.update({ lastEnergyRegen: now });
        }
        else {
            const timeDiff = (now - lastCommandTime) / 1000 / 60;
            const energyGained = Math.floor(timeDiff / 5);
            if (energyGained >= 1) {
                let newEnergy = Math.floor(findplayer.get('energy') + energyGained);
                if (newEnergy > 200) {
                    newEnergy = 200;
                }
                findplayer.update({ energy: newEnergy, lastEnergyRegen: now });
            }
        }
    }

    // Start
    if (command === 'start') {
        try {
            await playerinformation.create({
                playerid: message.author.id,
                money: 500,
                level: 1,
                beeSlots: 6,
                energy: 200,
                lastEnergyRegen: null,
                lastAdvClaim: Date.now(),
                area: 'backyard',
                currentQuest: 0,
                beeTeam: '[]',
            });
            await message.channel.send('Congrats, you have now started!');
            return;
            }
            catch (error) {
                if (error.name === 'SequelizeUniqueConstraintError') {
                    await message.channel.send('Oops, it appears you already have started!');
                    return;
                }
            }
    }

    if (findplayer) {
        // Help
        if (command === 'help') {
            const helpembed = new EmbedBuilder()
                .setColor(0xffe521)
                .setFooter({ text: beeFact() })
                .setAuthor({ name: 'Help', iconURL: message.author.displayAvatarURL() })
                .addFields(
                { name: 'Help', value: 'Hello! If you are using this command chances are you\'re new here. If not, go down to find the available commands.' },
                { name: 'Commands', value: '- start - Starts your adventure \n- profile - Displays your stats \n- bees - Shows the bees you own \n- shop - Shows the bee shop \n- buy - Lets you buy a bee or item from the bee shop \n- sell - Sells an item or bee of your choice. To sell bees, use their IBI \n- inventory - Lets you check all the items in your inventory \n- find - Go looking for a bee in your current area. \n- claim - Claim anything found by your bees while they work.' });
            await message.channel.send({ embeds: [helpembed] });
        }

        // Profile
        else if (command === 'profile' || command === 'p' || command === 'pr') {
            if (!args[0]) {
                try {
                    const profileembed = new EmbedBuilder()
                    .setColor(0xffe521)
                    .setFooter({ text: beeFact() })
                    .setAuthor({ name: `${message.author.displayName}'s profile`, iconURL: message.author.displayAvatarURL() })
                    .setThumbnail(message.author.displayAvatarURL())
                    .addFields(
                        { name: 'Stats', value:
                        `\nMoney: ${findplayer.get('money')}` +
                        `\nBee Slots: ${findplayer.get('beeSlots')}` +
                        `\nHive: ${capitaliseWords(findplayer.get('area'))}` +
                        `\nEnergy: ${findplayer.get('energy')}`,
                    });
                    await message.channel.send({ embeds: [profileembed] });
                }
                catch (error) {
                    await message.channel.send(`There was an error! ${error.name}: ${error.message}`);
                    console.log(error);
                }
            }
            else if (args[0]) {
                try {
                    const mentionId = args[0].replace(/[\\<>@#&!]/g, '');
                    const profileUser = await client.users.fetch(mentionId);
                    const findTarget = await playerinformation.findOne({ where: { playerid: mentionId } });
                    const profileembed = new EmbedBuilder()
                        .setColor(0xffe521)
                        .setAuthor({ name: `${profileUser.displayName}'s profile`, iconURL: profileUser.displayAvatarURL() })
                        .setFooter({ text: beeFact() })
                        .setThumbnail(profileUser.displayAvatarURL())
                        .addFields(
                            { name: 'Stats', value:
                            `\nMoney: ${findTarget.get('money')}` +
                            `\nBee Slots: ${findTarget.get('beeSlots')}` +
                            `\nHive: ${capitaliseWords(findTarget.get('area'))}` +
                            `\nEnergy: ${findTarget.get('energy')}`,
                        });
                    await message.channel.send({ embeds: [profileembed] });
                }
                catch (error) {
                    if (error.name === 'TypeError') {
                        await message.channel.send('This player has not started!');
                    }
                    else if (error.name === 'DiscordAPIError[10013]') {
                        await message.channel.send('Please mention a player!');
                    }
                    else {
                        await message.channel.send(`There was an error! ${error.name}: ${error.message}`);
                        console.log(error);
                    }
                }
            }
        }

        // Bees
        else if (command === 'bees') {
                if (!args[0]) {
                    try {
                        const findPlayerBees = await playerbees.findAll({ where: { playerid: message.author.id }, order: sequelize.literal('IBI ASC') });
                        let pages = Math.ceil(findPlayerBees.length / 6);
                        if (pages === 0) {
                            pages = 1;
                        }
                        const embeds = [];
                        for (let page = 0; page < pages; page++) {
                            const beeFields = [];
                            const startIndex = page * 6;
                            const beesOnPage = findPlayerBees.slice(startIndex, startIndex + 6);
                            const beeembed = new EmbedBuilder()
                                .setColor(0xffe521)
                                .setAuthor({ name: `${message.author.displayName}'s bees - Page ${page + 1}`, iconURL: message.author.displayAvatarURL() })
                                .setFooter({ text: beeFact() })
                                .addFields(
                                    { name: 'Bees', value: `These are all your bees. They will do various things for you, and are very useful to you. \nIBI stands for Individual Bee Identifier and should be used when selling or doing other actions on specific bees. \n\nBee slots: ${await playerbees.count({ where: { playerid: message.author.id } })}/${findplayer.get('beeSlots')}` },
                                );
                            for (let count = 0; count < beesOnPage.length; count++) {
                                const nextBee = await beelist.findOne({ where: { beeid: beesOnPage[count].dataValues.beeid } });
                                beeFields.push({ name: `\`IBI: ${beesOnPage[count].dataValues.IBI}\` <:Basic_Bee:1149318543553351701> ${capitaliseWords(nextBee.get('beeName'))}`, value: `Grade: ${nextBee.get('beeGrade')} \nTier: ${beesOnPage[count].dataValues.beeTier}/10 \nLevel: ${beesOnPage[count].dataValues.beeLevel}/150 \nPower: ${beesOnPage[count].dataValues.beePower} \nHealth: ${beesOnPage[count].dataValues.beeHealth}`, inline: true });
                            }
                            if (beeFields.length === 0) {
                                beeembed.addFields({ name: '\u200b', value: 'You have no bees :( \n Buy some at the shop (bee shop)' });
                            }
                            for (let count = 0; count < beeFields.length; count++) {
                                beeembed.addFields(beeFields[count]);
                            }
                            embeds.push(beeembed);
                        }
                        if (embeds.length > 1) {
                            const row = new ActionRowBuilder()
                            .addComponents([
                                new ButtonBuilder()
                                    .setCustomId('firstPage')
                                    .setStyle(ButtonStyle.Secondary)
                                    .setEmoji('⏪'),
                                new ButtonBuilder()
                                    .setCustomId('prevPage')
                                    .setStyle(ButtonStyle.Secondary)
                                    .setEmoji('◀️'),
                                new ButtonBuilder()
                                    .setCustomId('nextPage')
                                    .setStyle(ButtonStyle.Secondary)
                                    .setEmoji('▶️'),
                                new ButtonBuilder()
                                    .setCustomId('lastPage')
                                    .setStyle(ButtonStyle.Secondary)
                                    .setEmoji('⏩'),
                            ]);
                            let currentPage = 0;
                            const embedMessage = await message.channel.send({ embeds: [embeds[0]], components: [row] });
                            const collector = message.channel.createMessageComponentCollector({ time: 90000 });
                            collector.on('collect', async i => {
                                if (message.author.id === findplayer.get('playerid')) {
                                    if (!i.deferred) {
                                        await i.deferUpdate();
                                    }
                                    if (i.customId === 'firstPage') {
                                        currentPage = 0;
                                    }
                                    else if (i.customId === 'prevPage') {
                                        currentPage = (currentPage - 1 + embeds.length) % embeds.length;
                                    }
                                    else if (i.customId === 'nextPage') {
                                        currentPage = (currentPage + 1) % embeds.length;
                                    }
                                    else if (i.customId === 'lastPage') {
                                        currentPage = embeds.length - 1;
                                    }
                                    await embedMessage.edit({ embeds: [embeds[currentPage]], components: [row] });
                                }
                            });
                        }
                        else {
                            await message.channel.send({ embeds: [embeds[0]] });
                        }
                    }
                    catch (error) {
                        if (error.name === 'TypeError') {
                            await message.channel.send('You haven\'t started yet! Use `bee start` to start!');
                            console.log(error);
                        }
                        else {
                            await message.channel.send(`There was an error! ${error.name}: ${error.message}`);
                            console.log(error);
                        }
                    }
                }
                else {
                    try {
                        const mentionId = args[0].replace(/[\\<>@#&!]/g, '');
                        const targetUser = await client.users.fetch(mentionId);
                        const findPlayerBees = await playerbees.findAll({ where: { playerid: targetUser.id }, order: sequelize.literal('IBI ASC') });
                        const findTarget = await playerinformation.findOne({ where: { playerid: mentionId } });
                        let pages = Math.ceil(findPlayerBees.length / 6);
                        if (pages === 0) {
                            pages = 1;
                        }
                        const embeds = [];
                        for (let page = 0; page < pages; page++) {
                            const beeFields = [];
                            const startIndex = page * 6;
                            const beesOnPage = findPlayerBees.slice(startIndex, startIndex + 6);
                            const beeembed = new EmbedBuilder()
                                .setColor(0xffe521)
                                .setAuthor({ name: `${targetUser.displayName}'s bees - Page ${page + 1}`, iconURL: targetUser.displayAvatarURL() })
                                .setFooter({ text: beeFact() })
                                .addFields(
                                    { name: 'Bees', value: `These are all your bees. They will do various things for you, and are very useful to you. \nIBI stands for Individual Bee Identifier and should be used when selling or doing other actions on specific bees. \n\nBee slots: ${await playerbees.count({ where: { playerid: targetUser.id } })}/${findTarget.get('beeSlots')}` },
                                );
                            for (let count = 0; count < beesOnPage.length; count++) {
                                const nextBee = await beelist.findOne({ where: { beeid: beesOnPage[count].dataValues.beeid } });
                                beeFields.push({ name: `\`IBI: ${beesOnPage[count].dataValues.IBI}\` <:Basic_Bee:1149318543553351701> ${capitaliseWords(nextBee.get('beeName'))}`, value: `Grade: ${nextBee.get('beeGrade')} \nTier: ${beesOnPage[count].dataValues.beeTier}/10 \nLevel: ${beesOnPage[count].dataValues.beeLevel}/150 \nPower: ${beesOnPage[count].dataValues.beePower} \nHealth: ${beesOnPage[count].dataValues.beeHealth}`, inline: true });
                            }
                            if (beeFields.length === 0) {
                                beeembed.addFields({ name: '\u200b', value: 'You have no bees :( \n Buy some at the shop (bee shop)' });
                            }
                            for (let count = 0; count < beeFields.length; count++) {
                                beeembed.addFields(beeFields[count]);
                            }
                            embeds.push(beeembed);
                        }
                        if (embeds.length > 1) {
                            const row = new ActionRowBuilder()
                            .addComponents([
                                new ButtonBuilder()
                                    .setCustomId('firstPage')
                                    .setStyle(ButtonStyle.Secondary)
                                    .setEmoji('⏪'),
                                new ButtonBuilder()
                                    .setCustomId('prevPage')
                                    .setStyle(ButtonStyle.Secondary)
                                    .setEmoji('◀️'),
                                new ButtonBuilder()
                                    .setCustomId('nextPage')
                                    .setStyle(ButtonStyle.Secondary)
                                    .setEmoji('▶️'),
                                new ButtonBuilder()
                                    .setCustomId('lastPage')
                                    .setStyle(ButtonStyle.Secondary)
                                    .setEmoji('⏩'),
                            ]);
                            let currentPage = 0;
                            const embedMessage = await message.channel.send({ embeds: [embeds[0]], components: [row] });
                            const collector = message.channel.createMessageComponentCollector({ time: 90000 });
                            collector.on('collect', async i => {
                                if (message.author.id === findplayer.get('playerid')) {
                                    if (!i.deferred) {
                                        await i.deferUpdate();
                                    }
                                    if (i.customId === 'firstPage') {
                                        currentPage = 0;
                                    }
                                    else if (i.customId === 'prevPage') {
                                        currentPage = (currentPage - 1 + embeds.length) % embeds.length;
                                    }
                                    else if (i.customId === 'nextPage') {
                                        currentPage = (currentPage + 1) % embeds.length;
                                    }
                                    else if (i.customId === 'lastPage') {
                                        currentPage = embeds.length - 1;
                                    }
                                    await embedMessage.edit({ embeds: [embeds[currentPage]], components: [row] });
                                }
                            });
                        }
                        else {
                            await message.channel.send({ embeds: [embeds[0]] });
                        }
                    }
                    catch (error) {
                        if (error.name === 'TypeError') {
                            await message.channel.send('This player has not started!');
                        }
                        else if (error.name === 'DiscordAPIError[10013]') {
                            await message.channel.send('Please mention a player!');
                        }
                        else {
                            await message.channel.send(`There was an error! ${error.name}: ${error.message}`);
                            console.log(error);
                        }
                    }
                }
        }

        // Shop
        else if (command === 'shop') {
            try {
                let text = '';
                const shopBees = await beelist.findAll({ where: { findType: 'shop' } });
                for (let count = 0; count < shopBees.length; count++) {
                    const findItems = await beelist.findOne({ where: { beeid: shopBees[count].dataValues.beeid } });
                    text += capitaliseWords(findItems.get('beeName')) + ` (${findItems.get('beeGrade')})` + ':' + '  ' + findItems.get('beePrice') + '\n';
                }
                let text2 = '';
                const shopItems = await items.findAll({ where: { findType: 'shop' } });
                for (let count = 0; count < shopItems.length; count++) {
                    const findItems = await items.findOne({ where: { itemid: shopItems[count].dataValues.itemid } });
                    text2 += capitaliseWords(findItems.get('itemName')) + ':' + '  ' + findItems.get('sellPrice') + '\n';
                }
                const shopembed = new EmbedBuilder()
                .setColor(0xffe521)
                .setTitle('The Bee Shop')
                .setFooter({ text: beeFact() })
                .addFields({ name: '\u200b', value: 'Hello, welcome to the bee shop! Here you can buy bees that can work for you. These bees are really useful, so I think you should buy some. You can also buy items which may aid you.' + '\u200b' })
                .addFields({ name: 'Bees', value: `\n\n${text}` }, { name: 'Items', value: `\n\n${text2}` });
                await message.channel.send({ embeds: [shopembed] });
            }
            catch (error) {
                await message.channel.send(`There was an error! ${error.name}: ${error.message}`);
                console.log(error);
            }
        }

        // Buy
        else if (command === 'buy') {
            try {
                    let lastArg = args[args.length - 1];
                    if (typeof parseInt(lastArg) === 'number' && Number.isNaN(parseInt(lastArg)) != true) {
                        args.pop();
                        lastArg = parseInt(lastArg);
                    }
                    else if (lastArg.toLowerCase() === 'all') {
                        args.pop();
                        lastArg = 'all';
                    }
                    else {
                        lastArg = 1;
                    }
                    const argsText = args.join(' ').toLowerCase();
                    const findBee = await beelist.findOne({ where: { beeName: argsText, findType: 'shop' } });
                    const findItem = await items.findOne({ where: { itemName: argsText, findType: 'shop' } });
                    if (findBee != null) {
                        if (lastArg === 'all') {
                            lastArg = Math.floor(findplayer.get('money') / findBee.get('beePrice'));
                        }
                        if (lastArg <= 0) {
                            await message.channel.send('The number has to be higher than 1 lmao');
                            return;
                        }
                        if (findplayer.get('money') >= findBee.get('beePrice') * lastArg) {
                            if (findplayer.get('beeSlots') >= await playerbees.count({ where: { playerid: message.author.id } }) + lastArg) {
                                const findplayerbees = await playerbees.findAll({ where: { playerid: message.author.id }, order: sequelize.literal('IBI ASC') });
                                for (let count = 0; count < lastArg; count++) {
                                    let nextIBI = 0;
                                    if (findplayerbees.length > 0) {
                                        let currentIBI = await findplayerbees[nextIBI].dataValues.IBI;
                                        while (nextIBI === currentIBI) {
                                            nextIBI++;
                                            if (findplayerbees[nextIBI] != undefined) {
                                                currentIBI = await findplayerbees[nextIBI].dataValues.IBI;
                                            }
                                        }
                                    }
                                    await playerbees.create({
                                        playerid: message.author.id,
                                        IBI: nextIBI,
                                        beeid: findBee.get('beeid'),
                                        beeLevel: 1,
                                        beeTier: findBee.get('beeBaseTier'),
                                        tierUpMod: 1,
                                        beePower: Math.floor(findBee.get('beeBasePower') * gradeMultipliers[findBee.get('beeBasePower')]),
                                        beeHealth: 100,
                                    });
                                }
                                await findplayer.update({ money: findplayer.get('money') - findBee.get('beePrice') * lastArg });
                                if (lastArg > 1) {
                                    await message.channel.send(`Bought ${lastArg} ${capitaliseWords(findBee.get('beeName'))}s for ${findBee.get('beePrice') * lastArg} money!`);
                                }
                                else {
                                    await message.channel.send(`Bought ${lastArg} ${capitaliseWords(findBee.get('beeName'))} for ${findBee.get('beePrice') * lastArg} money!`);
                                }
                            }
                            else {
                                await message.channel.send('You don\'t have enough bee slots for this many bees! Get some more bozo');
                            }
                        }
                        else {
                            await message.channel.send('You are too poor lmao');
                        }
                    }
                    else if (findItem != null) {
                        if (lastArg === 'all') {
                            lastArg = Math.floor(findplayer.get('money') / findItem.get('sellPrice'));
                        }
                        if (lastArg <= 0) {
                            await message.channel.send('The number has to be higher than 1 lmao');
                            return;
                        }
                        if (findplayer.get('money') >= findItem.get('sellPrice') * lastArg) {
                            const findInvenItem = await inventory.findOne({ where: { itemid: findItem.get('itemid'), playerid: message.author.id } });
                            if (findInvenItem === null) {
                                await inventory.create({
                                    playerid: message.author.id,
                                    itemid: findItem.get('itemid'),
                                    itemAmount: 1 * lastArg,
                                });
                            }
                            else {
                                await findInvenItem.update({ itemAmount: findInvenItem.get('itemAmount') + 1 * lastArg });
                            }
                            await findplayer.update({ money: findplayer.get('money') - findItem.get('sellPrice') * lastArg });
                            if (lastArg > 1) {
                                await message.channel.send(`Bought ${lastArg} ${capitaliseWords(findItem.get('itemName'))}s for ${findItem.get('sellPrice') * lastArg} money!`);
                            }
                            else {
                                await message.channel.send(`Bought the ${capitaliseWords(findItem.get('itemName'))} for ${findItem.get('sellPrice') * lastArg} money!`);
                            }
                        }
                        else {
                            await message.channel.send('You are too poor lmao');
                        }
                    }
                    else {
                        await message.channel.send('This isn\'t a buyable kind of bee or item!');
                    }
            }
            catch (error) {
                await message.channel.send(`There was an error! ${error.name}: ${error.message}`);
                console.log(error);
            }
        }

        // Sell
        else if (command === 'sell') {
            try {
                let lastArg = args[args.length - 1];
                if (typeof parseInt(lastArg) === 'number' && Number.isNaN(parseInt(lastArg)) != true) {
                    args.pop();
                    lastArg = parseInt(lastArg);
                }
                else if (lastArg.toLowerCase() === 'all') {
                    args.pop();
                    lastArg = 'all';
                }
                else {
                    lastArg = 1;
                }
                const argsText = args.join(' ').toLowerCase();
                if (argsText) {
                    const findItem = await items.findOne({ where: { itemName: argsText } });
                    if (findItem != null) {
                        const findInvenItem = await inventory.findOne({ where: { playerid: message.author.id, itemid: findItem.get('itemid') } });
                        if (findInvenItem) {
                            if (lastArg === 'all') {
                                lastArg = findInvenItem.get('itemAmount');
                            }
                            if (lastArg <= 0) {
                                await message.channel.send('The number has to be higher than 1 lmao');
                                return;
                            }
                            if (lastArg > findInvenItem.get('itemAmount')) {
                                await message.channel.send('You do not have enough of this item!');
                            }
                            else if (lastArg === findInvenItem.get('itemAmount') && lastArg != 1) {
                                await message.channel.send(`Sold ${lastArg} ${capitaliseWords(findItem.get('itemName'))}s for ${findItem.get('sellPrice') * lastArg} money!`);
                                await findInvenItem.destroy();
                                await findplayer.update({ money: findplayer.get('money') + findItem.get('sellPrice') * lastArg });
                            }
                            else if (lastArg > 1) {
                                await message.channel.send(`Sold ${lastArg} ${capitaliseWords(findItem.get('itemName'))}s for ${findItem.get('sellPrice') * lastArg} money!`);
                                await findInvenItem.update({ itemAmount: findInvenItem.get('itemAmount') - lastArg });
                                await findplayer.update({ money: findplayer.get('money') + findItem.get('sellPrice') * lastArg });
                            }
                            else if (lastArg === 1 && lastArg === findInvenItem.get('itemAmount')) {
                                await message.channel.send(`Sold ${lastArg} ${capitaliseWords(findItem.get('itemName'))} for ${findItem.get('sellPrice') * lastArg} money!`);
                                await findInvenItem.destroy();
                                await findplayer.update({ money: findplayer.get('money') + findItem.get('sellPrice') * lastArg });
                            }
                            else {
                                await message.channel.send(`Sold ${lastArg} ${capitaliseWords(findItem.get('itemName'))} for ${findItem.get('sellPrice') * lastArg} money!`);
                                await findInvenItem.update({ itemAmount: findInvenItem.get('itemAmount') - lastArg });
                                await findplayer.update({ money: findplayer.get('money') + findItem.get('sellPrice') * lastArg });
                            }
                        }
                        else {
                            await message.channel.send('You have to have the item lol');
                        }
                    }
                    else {
                        await message.channel.send('This isn\'t an existing item!');
                    }
                }
                else {
                    let beeTeam = JSON.parse(findplayer.get('beeTeam'));
                    const findBee = await playerbees.findOne({ where: { playerid: message.author.id, IBI: lastArg } });
                    if (findBee != null) {
                        if (beeTeam.includes(findBee.get('IBI'))) {
                            const teamIndex = beeTeam.indexOf(findBee.get('IBI'));
                            beeTeam.splice(teamIndex, 1);
                        }
                        beeTeam = JSON.stringify(beeTeam);
                        const findBeeName = await beelist.findOne({ where: { beeid: findBee.get('beeid') } });
                        await findBee.destroy();
                        await findplayer.update({ money: findplayer.get('money') + findBeeName.get('beePrice') / 2, beeTeam: beeTeam });
                        await message.channel.send(`Sold the ${capitaliseWords(findBeeName.get('beeName'))}!`);
                    }
                    else {
                        await message.channel.send('This isn\'t a bee you own!');
                    }
                }
            }
            catch (error) {
                await message.channel.send(`There was an error! ${error.name}: ${error.message}`);
                console.log(error);
            }
        }

        // Inventory
        else if (command === 'inventory' || command === 'i') {
            if (!args[0]) {
                try {
                    let text = '';
                    const findPlayerInven = await inventory.findAll({ where: { playerid: message.author.id } });
                    for (let count = 0; count < findPlayerInven.length; count++) {
                        const findItems = await items.findOne({ where: { itemid: findPlayerInven[count].dataValues.itemid } });
                        text += capitaliseWords(findItems.get('itemName')) + ':' + '  ' + findPlayerInven[count].get('itemAmount') + '\n';
                    }
                    if (text === '') {
                        text += 'No items here :( \nFind or buy some.';
                    }
                    const invenembed = new EmbedBuilder()
                        .setColor(0xffe521)
                        .setAuthor({ name: `${message.author.displayName}'s inventory`, iconURL: message.author.displayAvatarURL() })
                        .setFooter({ text: beeFact() })
                        .addFields({ name: 'Inventory', value: 'This is your inventory. All of your items will appear here.' })
                        .addFields({ name: 'Items', value: `\n${text}` });
                    await message.channel.send({ embeds: [invenembed] });
                }
                catch (error) {
                    await message.channel.send(`There was an error! ${error.name}: ${error.message}`);
                    console.log(error);
                }
            }
            else {
                try {
                    const mentionId = args[0].replace(/[\\<>@#&!]/g, '');
                    const targetUser = await client.users.fetch(mentionId);
                    let text = '';
                    const findPlayerInven = await inventory.findAll({ where: { playerid: targetUser.id } });
                    for (let count = 0; count < findPlayerInven.length; count++) {
                        const findItems = await items.findOne({ where: { itemid: findPlayerInven[count].dataValues.itemid } });
                        text += capitaliseWords(findItems.get('itemName')) + ':' + '  ' + findPlayerInven[count].get('itemAmount') + '\n';
                    }
                    if (text === '') {
                        text += 'No items here :(';
                    }
                    const invenembed = new EmbedBuilder()
                        .setColor(0xffe521)
                        .setAuthor({ name: `${targetUser.displayName}'s inventory`, iconURL: targetUser.displayAvatarURL() })
                        .setFooter({ text: beeFact() })
                        .addFields({ name: 'Inventory', value: 'This is your inventory. All of your items will appear here.' })
                        .addFields({ name: 'Items', value: `\n${text}` });
                    await message.channel.send({ embeds: [invenembed] });
                }
                catch (error) {
                    await message.channel.send(`There was an error! ${error.name}: ${error.message}`);
                    console.log(error);
                }
            }
        }

        // Find
        else if (command === 'find') {
            try {
                if (findplayer.get('energy') - 20 >= 0) {
                    const findPlayerBeeSlots = await playerinformation.findOne({ where: { playerid: message.author.id } });
                    if (findPlayerBeeSlots.get('beeSlots') >= await playerbees.count({ where: { playerid: message.author.id } }) + 1) {
                        let beeFound = undefined;
                        while (beeFound === undefined) {
                            const gradeNumber = Math.floor(Math.random() * 101);
                            if (gradeNumber <= 15) {
                                beeFound = await findBeeCommand('F', findplayer.get('area'));
                            }
                            else if (gradeNumber > 15 && gradeNumber <= 45) {
                                beeFound = await findBeeCommand('E', findplayer.get('area'));
                            }
                            else if (gradeNumber > 45 && gradeNumber <= 70) {
                                beeFound = await findBeeCommand('D', findplayer.get('area'));
                            }
                            else if (gradeNumber > 70 && gradeNumber <= 85) {
                                beeFound = await findBeeCommand('C', findplayer.get('area'));
                            }
                            else if (gradeNumber > 85 && gradeNumber <= 95) {
                                beeFound = await findBeeCommand('B', findplayer.get('area'));
                            }
                            else if (gradeNumber > 95 && gradeNumber <= 99) {
                                beeFound = await findBeeCommand('A', findplayer.get('area'));
                            }
                            else if (gradeNumber === 100) {
                                beeFound = await findBeeCommand('S', findplayer.get('area'));
                            }
                        }
                        const findembed = new EmbedBuilder()
                            .setColor(0xffe521)
                            .setAuthor({ name: `${message.author.displayName}'s exploration results (-20 energy)`, iconURL: message.author.displayAvatarURL() })
                            .setFooter({ text: beeFact() })
                            .addFields({ name: `${capitaliseWords((await beeFound).dataValues.beeName)}`, value: `Grade: ${(await beeFound).dataValues.beeGrade}` });
                        await message.channel.send({ embeds: [findembed] });
                        const findplayerbees = await playerbees.findAll({ where: { playerid: message.author.id }, order: sequelize.literal('IBI ASC') });
                        let nextIBI = 0;
                        if (findplayerbees.length > 0) {
                            let currentIBI = await findplayerbees[nextIBI].dataValues.IBI;
                            while (nextIBI === currentIBI) {
                                nextIBI++;
                                if (findplayerbees[nextIBI] != undefined) {
                                    currentIBI = await findplayerbees[nextIBI].dataValues.IBI;
                                }
                            }
                        }
                        await playerbees.create({
                            playerid: message.author.id,
                            IBI: nextIBI,
                            beeid: (await beeFound).dataValues.beeid,
                            beeLevel: 1,
                            beeTier: (await beeFound).dataValues.beeBaseTier,
                            tierUpMod: 1,
                            beePower: Math.floor((await beeFound).dataValues.beeBasePower * gradeMultipliers[(await beeFound).dataValues.beeGrade]),
                            beeHealth: 100,
                        });
                        await findplayer.update({ energy: findplayer.get('energy') - 20 });
                    }
                    else {
                        await message.channel.send('You don\'t have enough bee slots for another bee! Get some more lmao');
                    }
                }
                else {
                    await message.channel.send('You don\'t have enough energy to look for another bee! Try resting for a while then try again.');
                }
            }
            catch (error) {
                if (error.name === 'TypeError') {
                    await message.channel.send('You haven\'t started yet! Use `bee start` to start.');
                }
                else {
                    await message.channel.send(`There was an error! ${error.name}: ${error.message}`);
                    console.log(error);
                }
            }
        }

        // Claim
        else if (command === 'claim') {
            try {
                if (findplayer.get('energy') - 10 >= 0) {
                    const claimTime = Date.now();
                    const itemsAvailable = await items.findAll({ where: { findType: findplayer.get('area') } });
                    const findAllBees = await playerbees.findAll({ where: { playerid: message.author.id } });
                    let beePowerMod = 0;
                    for (let i = 0; i < findAllBees.length; i++) {
                        beePowerMod += findAllBees[i].dataValues.beePower;
                    }
                    beePowerMod /= 100;
                    const advTime = ((claimTime - findplayer.get('lastAdvClaim')) / 1000 / 60) * beePowerMod;
                    const moneyGained = Math.floor(Math.random() * 11 * advTime);
                    let itemsGained = 0;
                    let text = '';
                    text += `Money: ${moneyGained}`;
                    for (let count = 0; count < itemsAvailable.length; count++) {
                        for (let i = 0; i < advTime; i++) {
                            if (Math.floor(Math.random() * itemsAvailable[count].dataValues.findChance) + 1 < itemsAvailable[count].dataValues.findChance) {
                                itemsGained++;
                            }
                        }
                        text += `\n${capitaliseWords(itemsAvailable[count].dataValues.itemName)}: ${itemsGained}`;
                        const findInvenItem = await inventory.findOne({ where: { itemid: itemsAvailable[count].dataValues.itemid, playerid: message.author.id } });
                        if (findInvenItem) {
                            await findInvenItem.update({ itemAmount: findInvenItem.get('itemAmount') + itemsGained });
                        }
                        else {
                            await inventory.create({
                                playerid: message.author.id,
                                itemid: itemsAvailable[count].dataValues.itemid,
                                itemAmount: itemsGained,
                            });
                        }
                        itemsGained = 0;
                    }
                    const advembed = new EmbedBuilder()
                        .setColor(0xffe521)
                        .setAuthor({ name: `${message.author.displayName}'s adventuring results`, iconURL: message.author.displayAvatarURL() })
                        .setFooter({ text: beeFact() })
                        .addFields({ name: 'The bees are back!', value: `You lost 10 energy :zap: \nThe bees brought with them: \n\n${text}` });
                    await message.channel.send({ embeds: [advembed] });
                    findplayer.update({ money: findplayer.get('money') + moneyGained, lastAdvClaim: claimTime, energy: findplayer.get('energy') - 10 });
                }
                else {
                    await message.channel.send('You do not have enough energy to claim rewards! Try resting for a bit then come back.');
                }
            }
            catch (error) {
                if (error.name === 'TypeError') {
                    await message.channel.send('You haven\'t started yet! Use `bee start` to start.');
                }
                else {
                    await message.channel.send(`There was an error! ${error.name}: ${error.message}`);
                    console.log(error);
                }
            }
        }

        // Train
        else if (command === 'train') {
            try {
                const chosenBee = args.shift();
                let lastArg = parseInt(args[args.length - 1]);
                if (typeof lastArg === 'number' && Number.isNaN(lastArg) != true) {
                    args.pop();
                }
                else {
                    lastArg = 1;
                }
                const findBee = await playerbees.findOne({ where: { IBI: chosenBee, playerid: message.author.id } });
                if (findBee != undefined) {
                    if (findBee.get('beeLevel') + lastArg <= 150) {
                        const findBeeName = await beelist.findOne({ where: { beeid: findBee.get('beeid') } });
                        let totalMoney = 0;
                        for (let count = findBee.get('beeLevel'); count < findBee.get('beeLevel') + lastArg; count++) {
                            totalMoney += (500 * count) * 1.67;
                        }
                        if (lastArg > 1 && findplayer.get('money') >= totalMoney) {
                            const row = new ActionRowBuilder()
                                .addComponents([
                                    new ButtonBuilder()
                                        .setCustomId('confirm')
                                        .setLabel('Yes')
                                        .setStyle(ButtonStyle.Success),
                                    new ButtonBuilder()
                                        .setCustomId('deny')
                                        .setLabel('No')
                                        .setStyle(ButtonStyle.Danger),
                                ]);
                            const confirmembed = new EmbedBuilder()
                                .setColor(0xffe521)
                                .setFooter({ text: beeFact() })
                                .addFields({ name: `Are you sure you want to train this bee ${lastArg} times?`, value: `Doing so will cost ${totalMoney} money` });
                            const confirmMessage = await message.channel.send({ embeds: [confirmembed], components: [row] });
                            const collectorFilter = i => i.user.id === message.author.id;
                            const collector = await message.channel.awaitMessageComponent({ filter: collectorFilter, time: 20000 });
                            if (collector.customId === 'confirm') {
                                confirmMessage.edit({ content: `Trained your ${capitaliseWords(findBeeName.get('beeName'))} for ${totalMoney} money! Your ${capitaliseWords(findBeeName.get('beeName'))}'s level increased by ${lastArg}!`, embeds: [], components: [] });
                                await findplayer.update({ money: findplayer.get('money') - totalMoney });
                                await findBee.update({ beeLevel: findBee.get('beeLevel') + lastArg, beePower: findBee.get('beePower') * (0.05 * lastArg + 1) });
                            }
                            if (collector.customId === 'deny') {
                                confirmMessage.edit({ content: `You decided not to train your ${capitaliseWords(findBeeName.get('beeName'))}.`, embeds: [], components: [] });
                            }
                        }
                        else if (lastArg === 1 && findplayer.get('money') >= totalMoney) {
                            await message.channel.send(`Trained your ${capitaliseWords(findBeeName.get('beeName'))} for ${totalMoney} money! Your ${capitaliseWords(findBeeName.get('beeName'))}'s level increased by one!`);
                            await findplayer.update({ money: findplayer.get('money') - totalMoney });
                            await findBee.update({ beeLevel: findBee.get('beeLevel') + 1 });
                        }
                        else {
                            await message.channel.send('You don\'t have enough money for this lol');
                        }
                    }
                    else {
                        await message.channel.send('If you train the bee this much, it will go above the level cap lol');
                    }
                }
                else {
                    await message.channel.send('This is not an IBI associated with a bee you own!');
                }
            }
            catch (error) {
                await message.channel.send(`There was an error! ${error.name}: ${error.message}`);
                console.log(error);
            }
        }

        // Breed
        else if (command === 'breed') {
            try {
                const chosenBee = args[0];
                const findBee = await playerbees.findOne({ where: { IBI: chosenBee, playerid: message.author.id } });
                if (findBee) {
                    if (findBee.get('beeTier') + 1 <= 10) {
                        if (findplayer.get('energy') - 50 >= 0) {
                            const tierRoll = Math.floor(Math.random() * 100);
                            let breedTier = 0;
                            if (tierRoll <= Math.floor(100 / findBee.get('beeTier') * findBee.get('tierUpMod'))) {
                                breedTier += findBee.get('beeTier') + 1;
                                findBee.update({ tierUpMod: 1, beePower: findBee.get('beePower') * 1.5 });
                            }
                            else {
                                breedTier = findBee.get('beeTier');
                                findBee.update({ tierUpMod: findBee.get('tierUpMod') + 0.05 });
                            }
                            const findBeeName = await beelist.findOne({ where: { beeid: findBee.get('beeid') } });
                            const breedEmbed = new EmbedBuilder()
                            .setColor(0xffe521)
                            .setAuthor({ name: `${message.author.displayName}'s breeding results`, iconURL: message.author.displayAvatarURL() })
                            .setFooter({ text: beeFact() })
                            .addFields({ name: `Your ${capitaliseWords(findBeeName.get('beeName'))} had an egg!`, value: `\n${capitaliseWords(findBeeName.get('beeName'))} \nTier: ${breedTier} \nLevel: 1` });
                            await message.channel.send({ embeds: [breedEmbed] });
                            findBee.update({ beeLevel: 1, beeTier: breedTier });
                            findplayer.update({ energy: findplayer.get('energy') - 50 });
                        }
                        else {
                            await message.channel.send('You do not have enough energy to breed your bees! Rest for a while then try again.');
                        }
                    }
                    else {
                        await message.channel.send('This bee is at the max tier!');
                    }
                }
                else {
                    await message.channel.send('This is not an IBI associated with a bee you own!');
                }
            }
            catch (error) {
                await message.channel.send(`There was an error! ${error.name}: ${error.message}`);
                console.log(error);
            }
        }

        // Map
        else if (command === 'map') {
            try {
                const findArea = await area.findOne({ where: { areaName: findplayer.get('area') } });
                const areaPos = areaMap[findArea.get('areaid')];
                const canvas = Canvas.createCanvas(512, 384);
                const context = canvas.getContext('2d');
                const background = await Canvas.loadImage('./Bee Economy Map.jpg');
                context.drawImage(background, 0, 0, canvas.width, canvas.height);
                context.font = '16px Comic Sans MS';
                context.fillStyle = '#ffffff';
                context.fillText('You', areaPos[0], areaPos[1] - 5);
                context.beginPath();
                context.arc(areaPos[0] + 15, areaPos[1] + 15, 15, 0, Math.PI * 2, true);
                context.closePath();
                context.clip();
                const avatar = await Canvas.loadImage(message.author.displayAvatarURL({ extension: 'jpg' }));
                context.drawImage(avatar, areaPos[0], areaPos[1], 30, 30);
                const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'map-image.png' });
                await message.channel.send({ files: [attachment] });
            }
            catch (error) {
                if (error.name === 'TypeError') {
                    await message.channel.send('You have not started yet! use \'bee start\' to start!');
                }
                else {
                    await message.channel.send(`There was an error! ${error.name}: ${error.message}`);
                    console.log(error);
                }
            }
        }

        // Move
        else if (command === 'move') {
            try {
                const argsText = args.join(' ').toLowerCase();
                const findArea = await area.findOne({ where: { areaName: argsText.toLowerCase() } });
                if (!findArea) {
                    await message.channel.send('This is not an area you can move your hive to!');
                    return;
                }
                if (findplayer.get('currentQuest') < findArea.get('areaid') - 1) {
                    await message.channel.send('You need to complete some more quests to move to this area!');
                    return;
                }
                await message.channel.send(`You migrated your hive to the ${findArea.get('areaName')}!`);
                await findplayer.update({ area: findArea.get('areaName') });
            }
            catch (error) {
                if (error.name === 'TypeError') {
                    await message.channel.send('You have not started yet! use \'bee start\' to start!');
                }
                else {
                    await message.channel.send(`There was an error! ${error.name}: ${error.message}`);
                    console.log(error);
                }
            }
        }

        // Quest
        else if (command === 'quest') {
            try {
                const findQuest = await quests.findOne({ where: { questid: findplayer.get('currentQuest') } });
                if (findQuest) {
                    const questInfo = findQuest.get('questInfo');
                    let text = '';
                    const reqKeys = Object.keys(questInfo.requirements);
                    const reqVals = Object.values(questInfo.requirements);
                    const completed = [];
                    for (let i = 0; i < reqKeys.length; i++) {
                        const findItem = await items.findOne({ where: { itemName: reqKeys[i] } });
                        const findBee = await beelist.findOne({ where: { beeName: reqKeys[i] } });
                        let reqProgress = null;
                        if (reqKeys[i] === 'money') {
                            reqProgress = findplayer.get('money');
                        }
                        else if (findItem) {
                            reqProgress = await inventory.findOne({ where: { playerid: message.author.id, itemid: findItem.get('itemid') } });
                            if (reqProgress) {
                                reqProgress = reqProgress.get('itemAmount');
                            }
                            else {
                                reqProgress = 0;
                            }
                        }
                        else if (findBee) {
                            reqProgress = await playerbees.count({ where: { playerid: message.author.id, beeid: findBee.get('beeid') } });
                        }
                        text += `\n${capitaliseWords(reqKeys[i])}: ${reqProgress}/${reqVals[i]}`;
                        if (reqProgress >= reqVals[i]) {
                            completed.push(true);
                        }
                        else {
                            completed.push(false);
                        }
                    }
                    let rewardText = '';
                    const rewardKeys = Object.keys(questInfo.rewards);
                    const rewardVals = Object.values(questInfo.rewards);
                    for (let i = 0; i < rewardKeys.length; i++) {
                        rewardText += `\n${capitaliseWords(rewardKeys[i])}: ${rewardVals[i]}`;
                    }
                    if (completed.filter(element => element == false).length > 0) {
                        const questEmbed = new EmbedBuilder()
                            .setColor(0xffe521)
                            .setAuthor({ name: `${message.author.displayName}'s quest`, iconURL: message.author.displayAvatarURL() })
                            .setFooter({ text: beeFact() })
                            .addFields({ name: questInfo.name, value: `${questInfo.description} \n\nRequirements: ${text} \n\nRewards: ${rewardText}` });
                        await message.channel.send({ embeds: [questEmbed] });
                    }
                    else {
                        const questEmbed = new EmbedBuilder()
                            .setColor(0xffe521)
                            .setAuthor({ name: 'Quest Complete!', iconURL: message.author.displayAvatarURL() })
                            .setFooter({ text: beeFact() })
                            .addFields({ name: 'You completed the quest! You unlocked the next area!', value: `\nRewards: ${rewardText} \n\nIf you got a bee, it'll show up in \`bee giftbox\`.` });
                        await message.channel.send({ embeds: [questEmbed] });
                        for (let i = 0; i < rewardKeys.length; i++) {
                            let value = rewardVals[i];
                            if (typeof rewardVals[i] === 'string') {
                                value = rewardVals[i].toLowerCase();
                            }
                            const key = rewardKeys[i].toLowerCase();
                            const findItem = await items.findOne({ where: { itemName: key } });
                            const findBee = await beelist.findOne({ where: { beeName: value } });
                            let reqProgress = null;
                            if (rewardKeys[i] === 'money') {
                                await findplayer.update({ money: findplayer.get('money') + rewardVals[i] });
                            }
                            else if (rewardKeys[i] === 'bee slots') {
                                await findplayer.update({ beeSlots: findplayer.get('beeSlots') + rewardVals[i] });
                            }
                            else if (findItem) {
                                reqProgress = await inventory.findOne({ where: { playerid: message.author.id, itemid: findItem.get('itemid') } });
                                if (reqProgress) {
                                    await reqProgress.update({ itemAmount: reqProgress.get('itemAmount') + rewardVals[i] });
                                }
                                else {
                                    await reqProgress.create({
                                        playerid: message.author.id,
                                        itemid: findItem.get('itemid'),
                                        itemAmount: rewardVals[i],
                                    });
                                }
                            }
                            else if (findBee) {
                                const findGifts = await giftbox.findAll({ where: { playerid: message.author.id } });
                                let nextid = 0;
                                if (findGifts.length > 0) {
                                    let currentid = await findGifts[nextid].dataValues.giftid;
                                    while (nextid === currentid) {
                                        nextid++;
                                        if (findGifts[nextid] != undefined) {
                                            currentid = await findGifts[nextid].dataValues.giftid;
                                        }
                                    }
                                }
                                await giftbox.create({
                                    playerid: message.author.id,
                                    giftid: nextid,
                                    beeid: findBee.get('beeid'),
                                    beeTier: findBee.get('beeBaseTier'),
                                    beePower: Math.floor(findBee.get('beeBasePower') * gradeMultipliers[findBee.get('beeGrade')]),
                                });
                            }
                        }
                        await findplayer.update({ currentQuest: findplayer.get('currentQuest') + 1 });
                    }
                }
                else {
                    await message.channel.send('You have completed every quest!');
                }
            }
            catch (error) {
                await message.channel.send(`There was an error! ${error.name}: ${error.message}`);
                console.log(error);
            }
        }

        // Bee Box
        else if (command === 'giftbox') {
            try {
                const findGifts = await giftbox.findAll({ where: { playerid: message.author.id }, order: sequelize.literal('giftid ASC') });
                let pages = Math.ceil(findGifts.length / 9);
                        if (pages === 0) {
                            pages = 1;
                        }
                        const embeds = [];
                        for (let page = 0; page < pages; page++) {
                            const beeFields = [];
                            const startIndex = page * 9;
                            const beesOnPage = findGifts.slice(startIndex, startIndex + 9);
                            const giftembed = new EmbedBuilder()
                                .setColor(0xffe521)
                                .setAuthor({ name: `${message.author.displayName}'s giftbox - Page ${page + 1}`, iconURL: message.author.displayAvatarURL() })
                                .setFooter({ text: beeFact() })
                                .addFields(
                                    { name: 'Bee Giftbox', value: 'This is your bee giftbox. Any bees earned from quests or otherwise can be found here. \nBees can be claimed with `bee receive` and then the gift id of the bee you want.' },
                                );
                            for (let count = 0; count < beesOnPage.length; count++) {
                                const nextBee = await beelist.findOne({ where: { beeid: beesOnPage[count].dataValues.beeid } });
                                beeFields.push({ name: `\`gift ID: ${beesOnPage[count].dataValues.giftid}\` <:Basic_Bee:1149318543553351701> ${capitaliseWords(nextBee.get('beeName'))}`, value: `Grade: ${nextBee.get('beeGrade')} \nPower: ${beesOnPage[count].dataValues.beePower}`, inline: true });
                            }
                            if (beeFields.length === 0) {
                                giftembed.addFields({ name: '\u200b', value: 'You have no bees to claim. \nComplete some quests for bees to appear here.' });
                            }
                            for (let count = 0; count < beeFields.length; count++) {
                                giftembed.addFields(beeFields[count]);
                            }
                            embeds.push(giftembed);
                        }
                        if (embeds.length > 1) {
                            const row = new ActionRowBuilder()
                            .addComponents([
                                new ButtonBuilder()
                                    .setCustomId('firstPage')
                                    .setStyle(ButtonStyle.Secondary)
                                    .setEmoji('⏪'),
                                new ButtonBuilder()
                                    .setCustomId('prevPage')
                                    .setStyle(ButtonStyle.Secondary)
                                    .setEmoji('◀️'),
                                new ButtonBuilder()
                                    .setCustomId('nextPage')
                                    .setStyle(ButtonStyle.Secondary)
                                    .setEmoji('▶️'),
                                new ButtonBuilder()
                                    .setCustomId('lastPage')
                                    .setStyle(ButtonStyle.Secondary)
                                    .setEmoji('⏩'),
                            ]);
                            let currentPage = 0;
                            const embedMessage = await message.channel.send({ embeds: [embeds[0]], components: [row] });
                            const collector = message.channel.createMessageComponentCollector({ time: 90000 });
                            collector.on('collect', async i => {
                                if (message.author.id === findplayer.get('playerid')) {
                                    if (!i.deferred) {
                                        await i.deferUpdate();
                                    }
                                    if (i.customId === 'firstPage') {
                                        currentPage = 0;
                                    }
                                    else if (i.customId === 'prevPage') {
                                        currentPage = (currentPage - 1 + embeds.length) % embeds.length;
                                    }
                                    else if (i.customId === 'nextPage') {
                                        currentPage = (currentPage + 1) % embeds.length;
                                    }
                                    else if (i.customId === 'lastPage') {
                                        currentPage = embeds.length - 1;
                                    }
                                    await embedMessage.edit({ embeds: [embeds[currentPage]], components: [row] });
                                }
                            });
                        }
                        else {
                            await message.channel.send({ embeds: [embeds[0]] });
                        }
            }
            catch (error) {
                await message.channel.send(`There was an error! ${error.name}: ${error.message}`);
                console.log(error);
            }
        }

        // Receive
        else if (command === 'receive') {
            try {
                const findGift = await giftbox.findOne({ where: { playerid: message.author.id, giftid: args[0] } });
                if (findGift) {
                    const findBee = await beelist.findOne({ where: { beeid: findGift.get('beeid') } });
                    const findplayerbees = await playerbees.findAll({ where: { playerid: message.author.id } });
                    if (await playerbees.count({ where: { playerid: message.author.id } }) + 1 <= findplayer.get('beeSlots')) {
                        await message.channel.send(`You received the ${capitaliseWords(findBee.get('beeName'))}!`);
                        let nextIBI = 0;
                        if (findplayerbees.length > 0) {
                            let currentIBI = await findplayerbees[nextIBI].dataValues.IBI;
                            while (nextIBI === currentIBI) {
                                nextIBI++;
                                if (findplayerbees[nextIBI] != undefined) {
                                    currentIBI = await findplayerbees[nextIBI].dataValues.IBI;
                                }
                            }
                        }
                        await playerbees.create({
                            playerid: message.author.id,
                            IBI: nextIBI,
                            beeid: findGift.get('beeid'),
                            beeLevel: 1,
                            beeTier: findGift.get('beeTier'),
                            tierUpMod: 1,
                            beePower: findGift.get('beePower'),
                            beeHealth: 100,
                        });
                        await findGift.destroy();
                    }
                    else {
                        await message.channel.send('You don\'t have enough bee slots for another bee!');
                    }
                }
                else {
                    await message.channel.send('There isn\'t a bee with this gift id!');
                }
            }
            catch (error) {
                await message.channel.send(`There was an error! ${error.name}: ${error.message}`);
                console.log(error);
            }
        }

        // Recipes
        else if (command === 'recipes') {
            try {
                let text = '';
                const recipeItems = await items.findAll({ where: { findType: 'craft' } });
                for (let count = 0; count < recipeItems.length; count++) {
                    const nextRecipe = await recipes.findOne({ where: { itemName: recipeItems[count].dataValues.itemName } });
                    const nextRecipeReqs = nextRecipe.get('itemReqs');
                    const recipeKeys = Object.keys(nextRecipeReqs.ingredients);
                    const recipeVals = Object.values(nextRecipeReqs.ingredients);
                    text += `\n**${capitaliseWords(recipeItems[count].dataValues.itemName)}** \n`;
                    for (let i = 0; i < recipeVals.length; i++) {
                        text += `${recipeVals[i]} ${recipeKeys[i]}, `;
                    }
                    text = text.slice(0, text.length - 2) + '\n';
                }
                const recipeEmbed = new EmbedBuilder()
                    .setColor(0xffe521)
                    .setAuthor({ name: 'Crafting Recipes' })
                    .setFooter({ text: beeFact() })
                    .addFields({ name: 'Recipes', value: text });
                await message.channel.send({ embeds: [recipeEmbed] });
            }
            catch (error) {
                await message.channel.send(`There was an error! ${error.name}: ${error.message}`);
                console.log(error);
            }
        }

        // Craft
        else if (command === 'craft') {
            try {
                let lastArg = parseInt(args[args.length - 1]);
                if (typeof lastArg === 'number' && Number.isNaN(lastArg) != true) {
                    args.pop();
                }
                else {
                    lastArg = 1;
                }
                const recipe = await recipes.findOne({ where: { itemName: args.join(' ') } });
                if (recipe) {
                    const RecipeReqs = recipe.get('itemReqs');
                    const recipeKeys = Object.keys(RecipeReqs.ingredients);
                    const recipeVals = Object.values(RecipeReqs.ingredients);
                    for (let i = 0; i < recipeKeys.length; i++) {
                        const item = await items.findOne({ where: { itemName: recipeKeys[i] } });
                        const playerItem = await inventory.findOne({ where: { itemid: item.get('itemid'), playerid: message.author.id } });
                        if (!playerItem) {
                            await message.channel.send(`You do not have enough ${capitaliseWords(item.get('itemName'))}s!`);
                            return;
                        }
                        else if (playerItem && playerItem.get('itemAmount') < recipeVals[i] * lastArg) {
                            await message.channel.send(`You do not have enough ${capitaliseWords(item.get('itemName'))}s!`);
                            return;
                        }
                        await playerItem.update({ itemAmount: playerItem.get('itemAmount') - recipeVals[i] * lastArg });
                    }
                    const craftedItem = await items.findOne({ where: { itemName: recipe.get('itemName') } });
                    const craftedItemCheck = await inventory.findOne({ where: { itemid: craftedItem.get('itemid'), playerid: message.author.id } });
                    if (craftedItemCheck) {
                        craftedItemCheck.update({ itemAmount: craftedItemCheck.get('itemAmount') + lastArg });
                    }
                    else {
                        inventory.create({
                            playerid: message.author.id,
                            itemid: craftedItem.get('itemid'),
                            itemAmount: lastArg,
                        });
                    }
                    await message.channel.send(`Crafted ${lastArg} ${craftedItem.get('itemName')}!`);
                }
                else {
                    await message.channel.send('There isn\'t a recipe with this item!');
                }
            }
            catch (error) {
                await message.channel.send(`There was an error! ${error.name}: ${error.message}`);
                console.log(error);
            }
        }

        // Team
        else if (command === 'team') {
            try {
                const subCommand = args.shift();
                let beeTeam = JSON.parse(findplayer.get('beeTeam'));
                if (subCommand === 'add') {
                    if (typeof parseInt(args[0]) === 'number' && Number.isNaN(args[0]) != true) {
                        if (beeTeam.length < 4) {
                            const findBee = await playerbees.findOne({ where: { IBI: args[0], playerid: message.author.id } });
                            if (findBee) {
                                if (beeTeam.includes(findBee.get('IBI'))) {
                                    await message.channel.send('This bee is already in your team!');
                                    return;
                                }
                                const findBeeInfo = await beelist.findOne({ where: { beeid: findBee.get('beeid') } });
                                await message.channel.send(`Added the ${capitaliseWords(findBeeInfo.get('beeName'))} to your team!`);
                                beeTeam.push(findBee.get('IBI'));
                                beeTeam = JSON.stringify(beeTeam);
                                findplayer.update({ beeTeam: beeTeam });
                            }
                            else {
                                await message.channel.send('Please provide a valid IBI.');
                            }
                        }
                        else {
                            await message.channel.send('Your team is full! Remove a bee first before adding another.');
                        }
                    }
                    else {
                        await message.channel.send('Please supply an IBI.');
                    }
                }
                else if (subCommand === 'remove') {
                    if (typeof parseInt(args[0]) === 'number' && Number.isNaN(args[0]) != true) {
                        const findBee = await playerbees.findOne({ where: { playerid: message.author.id, IBI: beeTeam[args[0] - 1] } });
                        if (!findBee) {
                            await message.channel.send('There is no bee in this team slot!');
                            return;
                        }
                        const findBeeInfo = await beelist.findOne({ where: { beeid: findBee.get('beeid') } });
                        await message.channel.send(`Removed the ${capitaliseWords(findBeeInfo.get('beeName'))} from your team!`);
                        beeTeam.splice(args[0] - 1, 1);
                        beeTeam = JSON.stringify(beeTeam);
                        findplayer.update({ beeTeam: beeTeam });
                    }
                    else {
                        await message.channel.send('Please give a team slot to remove a bee from.');
                    }
                }
                else {
                    const teamEmbed = new EmbedBuilder()
                        .setColor(0xffe521)
                        .setAuthor({ name: `${message.author.displayName}'s team`, iconURL: message.author.displayAvatarURL() })
                        .setFooter({ text: beeFact() });
                    for (const key in beeTeam) {
                        const findBee = await playerbees.findOne({ where: { IBI: beeTeam[key], playerid: message.author.id } });
                        if (findBee) {
                            const findBeeInfo = await beelist.findOne({ where: { beeid: findBee.get('beeid') } });
                            teamEmbed.addFields({ name: `\`IBI: ${findBee.get('IBI')}\` ${findBeeInfo.get('beeName')} (${findBeeInfo.get('beeGrade')})`, value: `Level: ${findBee.get('beeLevel')} \nTier: ${findBee.get('beeTier')}`, inline: true });
                        }
                        else if (beeTeam.length === 0) {
                            teamEmbed.addFields({ name: 'Your team is empty', value: 'Try adding some bees to your team.' });
                        }
                    }
                    await message.channel.send({ embeds: [teamEmbed] });
                }
            }
            catch (error) {
                await message.channel.send(`There was an error! ${error.name}: ${error.message}`);
                console.log(error);
            }
        }

        // Dojo
        else if (command === 'dojo') {
            const subCommand = args.shift();
            if (subCommand === 'train') {
                const selectedBee = args[0];
                const skillType = args[1];
            }
            else {
                const currentDojoStatus = JSON.parse(findplayer.get('dojoStatus'));
                let text;
                if (currentDojoStatus.length === 0) { text = '**No bee currently in training**'; }
                const dojoEmbed = new EmbedBuilder()
                        .setColor(0xffe521)
                        .setAuthor({ name: 'The Dojo' })
                        .addFields({ name: 'Welcome to the dojo!',
                        value: `Here, you can give bees new skills or improve existing skills! \nThese skills can provide passive buffs or special abilities that can be activated in battle. \nBees take time to train. \nOnly one bee can be trained at a time. \n\nCurrent training status: \n${text}` })
                        .setFooter({ text: beeFact() });
                await message.channel.send({ embeds: [dojoEmbed] });
            }
        }

        // Master Commands - Tester Commands ONLY
        else if (command === 'mc') {
            try {
                if (message.member.roles.cache.some(role => role.id === '1065889080556146748')) {
                        let lastArg = parseInt(args[args.length - 1]);
                        if (typeof lastArg === 'number' && Number.isNaN(lastArg) != true) {
                            args.pop();
                        }
                        else {
                            lastArg = 1;
                        }
                        if (args[0] === 'refill') {
                            await findplayer.update({ energy: 200 });
                            await message.channel.send(':zap: Energy refilled!');
                        }
                        else if (args[0] === 'gift') {
                            await findplayer.update({ money: findplayer.get('money') + lastArg });
                            await message.channel.send(`You were given ${lastArg} money!`);
                        }
                        else if (args[0] === 'create') {
                            args.splice(0, 1);
                            const argsText = args.join(' ').toLowerCase();
                            const findItem = await items.findOne({ where: { itemName: argsText } });
                            const findPlayerInven = await inventory.findOne({ where: { playerid: message.author.id, itemid: findItem.get('itemid') } });
                            if (findPlayerInven) {
                                await findPlayerInven.update({ itemAmount: findPlayerInven.get('itemAmount') + lastArg });
                            }
                            else {
                                await inventory.create({
                                    playerid: message.author.id,
                                    itemid: findItem.get('itemid'),
                                    itemAmount: lastArg,
                                });
                            }
                            if (lastArg > 1) {
                                await message.channel.send(`You created ${lastArg} ${capitaliseWords(findItem.get('itemName'))}s out of thin air!`);
                            }
                            else {
                                await message.channel.send(`You created ${lastArg} ${capitaliseWords(findItem.get('itemName'))} out of thin air!`);
                            }
                        }
                        else if (args[0] === 'warp') {
                            const timeWarped = lastArg * 60 * 1000;
                            await findplayer.update({ lastAdvClaim: findplayer.get('lastAdvClaim') - timeWarped });
                            if (lastArg > 1) {
                                await message.channel.send(`You warped time by ${lastArg} minutes!`);
                            }
                            else {
                                await message.channel.send(`You warped time by ${lastArg} minute!`);
                            }
                        }
                }
            }
            catch (error) {
                await message.channel.send(`There was an error! ${error.name}: ${error.message}`);
                console.log(error);
            }
        }
    }
    else {
        await message.channel.send('You haven\'t started yet! Use `bee start` to start.');
    }
});

// Log in to Discord with your client's token
client.login(token);