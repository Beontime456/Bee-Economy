// Require the necessary classes for the bot to function
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { token } = require('./config.json');
const { Sequelize, DataTypes } = require('sequelize');

// Create a new client instance
const client = new Client({ intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    ] });

client.commands = new Collection();

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
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
}

// Define the sequelize database for easy connection and access
const sequelize = new Sequelize('database', 'user', 'password', {
    host: 'localhost',
    dialect: 'sqlite',
    logging: false,
    storage: 'playerinfo.sqlite',
});

// Sync required tables for creation and access of data
const playerinformation = sequelize.define('playerinformation', {
    playerid: {
        type: DataTypes.STRING,
        primaryKey: true,
    },
    money: DataTypes.INTEGER,
    beeSlots: DataTypes.INTEGER,
    energy: DataTypes.INTEGER,
    lastEnergyRegen: DataTypes.INTEGER,
    area: DataTypes.STRING,
}, {
        timestamps: false,
    });
playerinformation.sync();

const playerbees = sequelize.define('playerbees', {
    playerid: DataTypes.STRING,
    IBI: DataTypes.INTEGER,
    beeid: DataTypes.INTEGER,
    beeLevel: DataTypes.INTEGER,
    beeTier: DataTypes.INTEGER,
}, {
        timestamps: false,
    });
playerbees.sync();

const beelist = sequelize.define('beelist', {
    beeid: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    beeName: {
        type: DataTypes.STRING,
    },
    beeGrade: DataTypes.STRING,
    beeBaseTier: DataTypes.INTEGER,
    findType: DataTypes.STRING,
    beePrice: DataTypes.INTEGER,
}, {
        timestamps: false,
    });
beelist.sync();

const items = sequelize.define('items', {
    itemid: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    itemName: DataTypes.STRING,
    sellPrice: DataTypes.INTEGER,
    findType: DataTypes.STRING,
}, {
        timestamps: false,
    });
items.sync();


const inventory = sequelize.define('inventory', {
    playerid: {
        type: DataTypes.INTEGER,
    },
    itemid: {
        type: DataTypes.INTEGER,
    },
    itemAmount: DataTypes.INTEGER,
}, {
        timestamps: false,
    });
inventory.sync();

const area = sequelize.define('area', {
    areaid: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    areaName: DataTypes.STRING,
}, {
        timestamps: false,
    });
area.sync();

// Initialise a prefix for the bot to see message commands
const prefix = 'bee ';

// Some basic universal functions to be used for several commands.
function capitaliseWords(sentence) {
    return sentence.replace(/\b\w/g, char => char.toUpperCase());
}
function beeFact() {
    const beeFacts = ['Bumble bees are apart of the apidae bee family.', 'The average bumble bee life span is 4 weeks.', 'The majority of bumble bee species in Europe seemingly like the colours violet or blue.',
    'A honey bee can fly up to 15 miles per hour.', 'Bees are relatives of ants!', 'Male drone bees don\'t have a stinger.', 'Bees have 5 eyes.', 'Bees struggle distinguishing red colours compared to bluer tones.',
    'Worker bees communicate with dancing or shaking their bodies.', 'A bee flaps it\'s wings 200x per second.', 'Bees can experience PTSD-like symptoms.', 'Bees recognize different human faces.',
    'Bees like humans who take care of them!', 'Bees are usually optimistic when successfully foraging, but can become depressed if momentarily trapped by a predatory spider.',
    'The Megachilidae Bee family has the most diverse nesting habits. They construct hives using mud, gravel, resin, plant fiber, wood pulp, and leaf pulp.', 'The Megachilidae bee family builds their nests in cavities, mainly in rotting wood, using leaves.',
    'The Andrenidae bee family is collectively known as mining bees. It consists of solitary bees that nest on the ground!', 'Halictidae bees are all ground-nesting bees with extremely diverse levels of sociality. Some species can even switch between being social or solitary depending on their environment.',
    'The Halictidae family also known as \'Sweet\' bees, because of their small size (4-8mm) these insects comprise some groups which are metallic in appearance.', 'The Stenotritidae bee family is the smallest of the seven bee families with 2 subfamilies and 21 species. The family is only found in Australia and closely related to Colletidae.'];
    const randomFact = Math.floor(Math.random() * 20);
    return beeFacts[randomFact];
}

// When the client is ready, run this code (only once)
// We use 'c' for the event parameter to keep it separate from the already defined 'client'
client.once(Events.ClientReady, c => {
	console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
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

    const now = Date.now;
    const findplayer = await playerinformation.findOne({ where: { playerid: interaction.user.id } });

    if (findplayer != null) {
        const lastCommandTime = findplayer.get('lastEnergyRegen');
        if (lastCommandTime === null) {
            findplayer.update({ lastEnergyRegen: now });
        }
        else {
            const timeDiff = (now - lastCommandTime) / 1000;
            if (timeDiff >= 1) {
                let newEnergy = findplayer.get('energy') + timeDiff;
                if (newEnergy > 200) {
                    newEnergy = 200;
                }
                findplayer.update({ energy: newEnergy });
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
            const timeDiff = (now - lastCommandTime) / 1000;
            if (timeDiff >= 1) {
                let newEnergy = Math.floor(findplayer.get('energy') + timeDiff);
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
                beeSlots: 6,
                energy: 200,
                lastEnergyRegen: null,
                area: 'backyard',
            });
            await message.channel.send('Congrats, you have now started!');
            }
            catch (error) {
                if (error.name === 'SequelizeUniqueConstraintError') {
                    await message.channel.send('Oops, it appears you already have started!');
                }
            }
    }
    else if (command === 'help') {
        const helpembed = new EmbedBuilder()
            .setColor(0xffe521)
            .setFooter({ text: beeFact() })
            .setAuthor({ name: 'Help', iconURL: message.author.displayAvatarURL() })
            .addFields(
            { name: 'Help', value: 'Hello! If you are using this command chances are you\'re new here. If not, go down to find the available commands.' },
            { name: 'Commands', value: '- start - Starts your adventure \n- profile - Displays your stats \n- bees - Shows the bees you own \n- shop - Shows the bee shop \n- buy - Lets you buy a bee or item from the bee shop \n- inventory - Lets you check all the items in your inventory' });
        await message.channel.send({ embeds: [helpembed] });
    }
    // Profile
    else if (command === 'profile' || command === 'p' || command === 'pr') {
        if (!args[0]) {
            try {
                const profileembed = new EmbedBuilder()
                .setColor(0xffe521)
                .setFooter({ text: beeFact() })
                .setAuthor({ name: `${message.author.username}'s profile`, iconURL: message.author.displayAvatarURL() })
                .setThumbnail(message.author.displayAvatarURL())
                .addFields(
                    { name: 'Stats', value:
                    `\nMoney :moneybag:: ${findplayer.get('money')}` +
                    `\nBee Slots :bee:: ${findplayer.get('beeSlots')}` +
                    `\nArea :evergreen_tree:: ${capitaliseWords(findplayer.get('area'))}` +
                    `\nEnergy :zap:: ${findplayer.get('energy')}`,
                });
                await message.channel.send({ embeds: [profileembed] });
            }
            catch (error) {
                if (error.name === 'TypeError') {
                    await message.channel.send('You need to start! Type bee start in order to start!');
                }
                else {
                    await message.channel.send(`There was an error! ${error.name}: ${error.message}`);
                    console.log(error);
                }
            }
        }
        else if (args[0]) {
            try {
                const mentionId = args[0].replace(/[\\<>@#&!]/g, '');
                const profileUser = await client.users.fetch(mentionId);
                const findTarget = await playerinformation.findOne({ where: { playerid: mentionId } });
                const profileembed = new EmbedBuilder()
                    .setColor(0xffe521)
                    .setAuthor({ name: `${profileUser.username}'s profile`, iconURL: profileUser.displayAvatarURL() })
                    .setFooter({ text: beeFact() })
                    .setThumbnail(profileUser.displayAvatarURL())
                    .addFields(
                        { name: 'Stats', value:
                        `\nMoney :moneybag:: ${findTarget.get('money')}` +
                        `\nBee Slots :bee:: ${findTarget.get('beeSlots')}` +
                        `\nArea :evergreen_tree:: ${capitaliseWords(findTarget.get('area'))}` +
                        `\nEnergy :zap:: ${findTarget.get('energy')}`,
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
                    const beeFields = [];
                    for (let count = 0; count < findPlayerBees.length; count++) {
                        const nextBee = await beelist.findOne({ where: { beeid: findPlayerBees[count].dataValues.beeid } });
                        beeFields.push({ name: `\`IBI: ${findPlayerBees[count].dataValues.IBI}\` ${capitaliseWords(nextBee.get('beeName'))}`, value: `Grade: ${nextBee.get('beeGrade')} \nTier: ${findPlayerBees[count].dataValues.beeTier} \nLevel: ${findPlayerBees[count].dataValues.beeLevel}`, inline: true });
                    }
                    if (beeFields.length === 0) {
                        beeFields.push({ name: '\u200b', value: 'You have no bees :( \n Buy some at the shop (bee shop)' });
                    }
                    const beeembed = new EmbedBuilder()
                        .setColor(0xffe521)
                        .setAuthor({ name: `${message.author.username}'s bees`, iconURL: message.author.displayAvatarURL() })
                        .setFooter({ text: beeFact() })
                        .addFields(
                            { name: 'Bees', value: `These are all your bees. They will do various things for you, and are very useful to you. \nIBI stands for Individual Bee Identifier and should be used when selling or doing other actions on specific bees. \n\nBee slots: ${await playerbees.count({ where: { playerid: message.author.id } })}/${findplayer.get('beeSlots')}` },
                        );
                    for (let count = 0; count < beeFields.length; count++) {
                        beeembed.addFields(beeFields[count]);
                    }
                    await message.channel.send({ embeds: [beeembed] });
                }
                catch (error) {
                    if (error.name === 'TypeError') {
                        await message.channel.send('You haven\'t started yet! Use bee start to start!');
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
                        const beeFields = [];
                        for (let count = 0; count < findPlayerBees.length; count++) {
                            const nextBee = await beelist.findOne({ where: { beeid: findPlayerBees[count].dataValues.beeid } });
                            beeFields.push({ name: `\`IBI: ${findPlayerBees[count].dataValues.IBI}\` ${capitaliseWords(nextBee.get('beeName'))}`, value: `Grade: ${nextBee.get('beeGrade')} \nTier: ${findPlayerBees[count].dataValues.beeTier} \nLevel: ${findPlayerBees[count].dataValues.beeLevel}`, inline: true });
                        }
                        if (beeFields.length === 0) {
                            beeFields.push({ name: '\u200b', value: 'This person has no bees :(' });
                        }
                        const beeembed = new EmbedBuilder()
                            .setColor(0xffe521)
                            .setAuthor({ name: `${targetUser.username}'s bees`, iconURL: targetUser.displayAvatarURL() })
                            .setFooter({ text: beeFact() })
                            .addFields(
                                { name: 'Bees', value: `These are all this person's bees. They will do various things for you, and are very useful to you. \nIBI stands for Individual Bee Identifier and should be used when selling or doing other actions on specific bees. \n\nBee slots: ${await playerbees.count({ where: { playerid: targetUser.id } })}/${findTarget.get('beeSlots')}` },
                            );
                        for (let count = 0; count < beeFields.length; count++) {
                            beeembed.addFields(beeFields[count]);
                        }
                        await message.channel.send({ embeds: [beeembed] });
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
            if (findplayer != null) {
                let lastArg = parseInt(args[args.length - 1]);
                if (typeof lastArg === 'number' && Number.isNaN(lastArg) != true) {
                    args.pop();
                }
                else {
                    lastArg = 1;
                }
                const argsText = args.join(' ').toLowerCase();
                const findBee = await beelist.findOne({ where: { beeName: argsText, findType: 'shop' } });
                const findItem = await items.findOne({ where: { itemName: argsText, findType: 'shop' } });
                if (findBee != null) {
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
                                });
                            }
                            await findplayer.update({ money: findplayer.get('money') - findBee.get('beePrice') * lastArg });
                            if (lastArg > 1) {
                                await message.channel.send(`Bought ${lastArg} ${capitaliseWords(findBee.get('beeName'))}s!`);
                            }
                            else {
                                await message.channel.send(`Bought ${lastArg} ${capitaliseWords(findBee.get('beeName'))}!`);
                            }
                        }
                        else {
                            await message.channel.send('You don\'t have enough bee slots for more bees! Get some more bozo');
                        }
                    }
                    else {
                        await message.channel.send('You are too poor lmao');
                    }
                }
                else if (findItem != null) {
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
                            await message.channel.send(`Bought ${lastArg} ${capitaliseWords(findItem.get('itemName'))}s!`);
                        }
                        else {
                            await message.channel.send(`Bought the ${capitaliseWords(findItem.get('itemName'))}!`);
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
            else {
                message.channel.send('You have not started yet! Use bee start to start.');
            }
        }
        catch (error) {
            await message.channel.send(`There was an error! ${error.name}: ${error.message}`);
            console.log(error);
        }
    }
    else if (command === 'sell') {
        try {
            if (findplayer) {
                let lastArg = parseInt(args[args.length - 1]);
                if (typeof lastArg === 'number' && Number.isNaN(lastArg) != true) {
                    args.pop();
                }
                else {
                    lastArg = 1;
                }
                const argsText = args.join(' ').toLowerCase();
                if (argsText) {
                    const findItem = await items.findOne({ where: { itemName: argsText } });
                    if (findItem != null) {
                        const findInvenItem = await inventory.findOne({ where: { playerid: message.author.id, itemid: findItem.get('itemid') } });
                        if (lastArg > findInvenItem.get('itemAmount')) {
                            await message.channel.send('You do not have enough of this item!');
                        }
                        else if (lastArg === findInvenItem.get('itemAmount') && lastArg != 1) {
                            await message.channel.send(`Sold ${lastArg} ${capitaliseWords(findItem.get('itemName'))}s!`);
                            await findInvenItem.destroy();
                            await findplayer.update({ money: findplayer.get('money') + findItem.get('sellPrice') * lastArg });
                        }
                        else if (lastArg > 1) {
                            await message.channel.send(`Sold ${lastArg} ${capitaliseWords(findItem.get('itemName'))}s!`);
                            await findInvenItem.update({ itemAmount: findInvenItem.get('itemAmount') - lastArg });
                            await findplayer.update({ money: findplayer.get('money') + findItem.get('sellPrice') * lastArg });
                        }
                        else if (lastArg === 1 && lastArg === findInvenItem.get('itemAmount')) {
                            await message.channel.send(`Sold ${lastArg} ${capitaliseWords(findItem.get('itemName'))}!`);
                            await findInvenItem.destroy();
                            await findplayer.update({ money: findplayer.get('money') + findItem.get('sellPrice') * lastArg });
                        }
                        else {
                            await message.channel.send(`Sold ${lastArg} ${capitaliseWords(findItem.get('itemName'))}!`);
                            await findInvenItem.update({ itemAmount: findInvenItem.get('itemAmount') - lastArg });
                            await findplayer.update({ money: findplayer.get('money') + findItem.get('sellPrice') * lastArg });
                        }
                    }
                    else {
                        await message.channel.send('This isn\'t an existing item!');
                    }
                }
                else {
                    const findBee = await playerbees.findOne({ where: { playerid: message.author.id, IBI: lastArg } });
                    if (findBee != null) {
                        const findBeeName = await beelist.findOne({ where: { beeid: findBee.get('beeid') } });
                        await findBee.destroy();
                        await findplayer.update({ money: findplayer.get('money') + findBeeName.get('beePrice') / 2 });
                        await message.channel.send(`Sold the ${capitaliseWords(findBeeName.get('beeName'))}!`);
                    }
                    else {
                        await message.channel.send('This isn\'t a bee you own!');
                    }
                }
            }
            else {
                await message.channel.send('You have not started yet. Use bee start to start.');
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
                    .setAuthor({ name: `${message.author.username}'s inventory`, iconURL: message.author.displayAvatarURL() })
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
                    .setAuthor({ name: `${targetUser.username}'s inventory`, iconURL: targetUser.displayAvatarURL() })
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
            const findPlayerBeeSlots = await playerinformation.findOne({ where: { playerid: message.author.id } });
            if (findPlayerBeeSlots.get('beeSlots') >= await playerbees.count({ where: { playerid: message.author.id } }) + 1) {
                const gradeNumber = Math.floor(Math.random() * 101);
                if (gradeNumber <= 15) {
                    const findableBees = await beelist.findAll({ where: { findType: findplayer.get('area'), beeGrade: 'F' } });
                    const beeFound = findableBees[Math.floor(Math.random() * findableBees.length)];
                    const findembed = new EmbedBuilder()
                        .setColor(0xffe521)
                        .setAuthor({ name: `${message.author.username}'s exploration results`, iconURL: message.author.displayAvatarURL() })
                        .setFooter({ text: beeFact() })
                        .addFields({ name: `${capitaliseWords(beeFound.get('beeName'))}`, value: `Grade: ${beeFound.get('beeGrade')}` });
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
                        beeid: beeFound.get('beeid'),
                        beeLevel: 1,
                        beeTier: beeFound.get('beeBaseTier'),
                    });
                }
                else if (gradeNumber > 15 && gradeNumber <= 45) {
                    const findableBees = await beelist.findAll({ where: { findType: findplayer.get('area'), beeGrade: 'E' } });
                    const beeFound = findableBees[Math.floor(Math.random() * findableBees.length)];
                    const findembed = new EmbedBuilder()
                        .setColor(0xffe521)
                        .setAuthor({ name: `${message.author.username}'s exploration results`, iconURL: message.author.displayAvatarURL() })
                        .setFooter({ text: beeFact() })
                        .addFields({ name: `${capitaliseWords(beeFound.get('beeName'))}`, value: `Grade: ${beeFound.get('beeGrade')}` });
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
                        beeid: beeFound.get('beeid'),
                        beeLevel: 1,
                        beeTier: beeFound.get('beeBaseTier'),
                    });
                }
                else if (gradeNumber > 45 && gradeNumber <= 70) {
                    const findableBees = await beelist.findAll({ where: { findType: findplayer.get('area'), beeGrade: 'D' } });
                    const beeFound = findableBees[Math.floor(Math.random() * findableBees.length)];
                    const findembed = new EmbedBuilder()
                        .setColor(0xffe521)
                        .setAuthor({ name: `${message.author.username}'s exploration results`, iconURL: message.author.displayAvatarURL() })
                        .setFooter({ text: beeFact() })
                        .addFields({ name: `${capitaliseWords(beeFound.get('beeName'))}`, value: `Grade: ${beeFound.get('beeGrade')}` });
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
                        beeid: beeFound.get('beeid'),
                        beeLevel: 1,
                        beeTier: beeFound.get('beeBaseTier'),
                    });
                }
                else if (gradeNumber > 70 && gradeNumber <= 85) {
                    const findableBees = await beelist.findAll({ where: { findType: findplayer.get('area'), beeGrade: 'C' } });
                    const beeFound = findableBees[Math.floor(Math.random() * findableBees.length)];
                    const findembed = new EmbedBuilder()
                        .setColor(0xffe521)
                        .setAuthor({ name: `${message.author.username}'s exploration results`, iconURL: message.author.displayAvatarURL() })
                        .setFooter({ text: beeFact() })
                        .addFields({ name: `${capitaliseWords(beeFound.get('beeName'))}`, value: `Grade: ${beeFound.get('beeGrade')}` });
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
                        beeid: beeFound.get('beeid'),
                        beeLevel: 1,
                        beeTier: beeFound.get('beeBaseTier'),
                    });
                }
                else if (gradeNumber > 85 && gradeNumber <= 95) {
                    const findableBees = await beelist.findAll({ where: { findType: findplayer.get('area'), beeGrade: 'B' } });
                    const beeFound = findableBees[Math.floor(Math.random() * findableBees.length)];
                    const findembed = new EmbedBuilder()
                        .setColor(0xffe521)
                        .setAuthor({ name: `${message.author.username}'s exploration results`, iconURL: message.author.displayAvatarURL() })
                        .setFooter({ text: beeFact() })
                        .addFields({ name: `${capitaliseWords(beeFound.get('beeName'))}`, value: `Grade: ${beeFound.get('beeGrade')}` });
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
                        beeid: beeFound.get('beeid'),
                        beeLevel: 1,
                        beeTier: beeFound.get('beeBaseTier'),
                    });
                }
                else if (gradeNumber > 95 && gradeNumber <= 99) {
                    const findableBees = await beelist.findAll({ where: { findType: findplayer.get('area'), beeGrade: 'A' } });
                    const beeFound = findableBees[Math.floor(Math.random() * findableBees.length)];
                    const findembed = new EmbedBuilder()
                        .setColor(0xffe521)
                        .setAuthor({ name: `${message.author.username}'s exploration results`, iconURL: message.author.displayAvatarURL() })
                        .setFooter({ text: beeFact() })
                        .addFields({ name: `${capitaliseWords(beeFound.get('beeName'))}`, value: `Grade: ${beeFound.get('beeGrade')}` });
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
                        beeid: beeFound.get('beeid'),
                        beeLevel: 1,
                        beeTier: beeFound.get('beeBaseTier'),
                    });
                }
                else if (gradeNumber === 100) {
                    const findableBees = await beelist.findAll({ where: { findType: findplayer.get('area'), beeGrade: 'S' } });
                    const beeFound = findableBees[Math.floor(Math.random() * findableBees.length)];
                    const findembed = new EmbedBuilder()
                        .setColor(0xffe521)
                        .setAuthor({ name: `${message.author.username}'s exploration results`, iconURL: message.author.displayAvatarURL() })
                        .setFooter({ text: beeFact() })
                        .addFields({ name: `${capitaliseWords(beeFound.get('beeName'))}`, value: `Grade: ${beeFound.get('beeGrade')}` });
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
                        beeid: beeFound.get('beeid'),
                        beeLevel: 1,
                        beeTier: beeFound.get('beeBaseTier'),
                    });
                }
                await findplayer.update({ energy: findplayer.get('energy') - 50 });
            }
            else {
                await message.channel.send('You don\'t have enough bee slots for another bee! Get some more lmao');
            }
        }
        catch (error) {
            if (error.name === 'TypeError') {
                await message.channel.send('You haven\'t started yet! Use bee start to start.');
            }
            else {
                await message.channel.send(`There was an error! ${error.name}: ${error.message}`);
                console.log(error);
            }
        }
    }
});

// Log in to Discord with your client's token
client.login(token);