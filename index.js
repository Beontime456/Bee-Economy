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
    ], allowedMentions: { repliedUser: false } });

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
const beelist = require('./models/beelist.js')(sequelize, Sequelize.DataTypes);
const items = require('./models/items.js')(sequelize, Sequelize.DataTypes);
const area = require('./models/area.js')(sequelize, Sequelize.DataTypes);
const inventory = require('./models/inventory.js')(sequelize, Sequelize.DataTypes);
const playerinformation = require('./models/playerinformation.js')(sequelize, Sequelize.DataTypes);
const playerbees = require('./models/playerbees.js')(sequelize, Sequelize.DataTypes);
const quests = require('./models/quests.js')(sequelize, Sequelize.DataTypes);
const giftbox = require('./models/claimbox.js')(sequelize, Sequelize.DataTypes);
const recipes = require('./models/recipes.js')(sequelize, Sequelize.DataTypes);
const skills = require('./models/skills.js')(sequelize, Sequelize.DataTypes);

playerinformation.sync();
playerbees.sync();
beelist.sync();
items.sync();
inventory.sync();
area.sync();
quests.sync();
giftbox.sync();
recipes.sync();
skills.sync();

// Initialise a prefix for the bot to see message commands
const prefix = 'bee ';

// Some basic universal functions and variables to be used for several commands.
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
    const randomFact = Math.floor(Math.random() * beeFacts.length);
    return beeFacts[randomFact];
}
async function findCommand(grade, type, ...values) {
    if (type === 'bee') {
        const findableBees = await beelist.findAll({ where: { findType: values[0], beeGrade: grade } });
        return findableBees[Math.floor(Math.random() * findableBees.length)];
    }
    else if (type === 'skill') {
        const findableSkills = await skills.findAll({ where: { skillRarity: grade, skillType: values[0], skillid: { [Sequelize.Op.notIn]: values[1] } } });
        return findableSkills[Math.floor(Math.random() * findableSkills.length)];
    }
}
async function msToTime(duration) {
    const seconds = Math.floor((duration / 1000) % 60),
      minutes = Math.floor((duration / (1000 * 60)) % 60),
      hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

    return hours + ' hours ' + minutes + ' minutes ' + seconds + ' seconds';
}

// Unfinished functions
async function turn(message, collector, filter, beeTeam) {
    collector.stop();
    await message.edit('Enemy attacked!');
    collector = message.createMessageComponentCollector({ filter, time: 90000 });
    collector.on('collect', async i => {
        if (!i.deferred) {
            await i.deferUpdate();
        }
        if (i.customId === 'attack') {
            turn(message, collector, filter);
        }
    });
    collector.on('end', (collected, reason) => {
        if (reason === 'time') {
            message.channel.send('You ran out of time and lost the fight!');
        }
    });
}
async function calculatePassives(beeObject) {
    for (const skillid in beeObject.skills) {
        const skill = skills.findOne({ where: { skillid: skillid } });
        const skillEffect = JSON.parse(skill.get('skillDetails'));
        if (skill.get('skillType') != 'passive') {
            continue;
        }
    }
}
async function calculateBeePower(bee) {
    if (bee.dataValues) {
        const findBee = await beelist.findOne({ where: { beeid: bee.dataValues.beeid } });
        const beePower = Math.floor(findBee.get('beeBasePower') * (1.04 ** bee.dataValues.beeLevel) * (1.1 ** bee.dataValues.beeTier) * gradeMultipliers[findBee.get('beeGrade')]);
        return beePower;
    }
    else {
        const findBee = await beelist.findOne({ where: { beeid: bee.get('beeid') } });
        const beePower = Math.floor(findBee.get('beeBasePower') * (1.04 ** bee.get('beeLevel')) * (1.1 ** bee.get('beeTier')) * gradeMultipliers[findBee.get('beeGrade')]);
        return beePower;
    }
}

// JSON Mappings - Hardcoded values for some of the various identifiers (e.g grade multipliers, grade rarities, map locations)
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
const gradeRarities = {
    'F': 15,
    'E': 45,
    'D': 70,
    'C': 85,
    'B': 95,
    'A': 99,
    'S': 100,
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

        if (findplayer === null && command != 'start') { return interaction.reply('You haven\'t started yet! Use `/start` to start!'); }

        try {
            await command.execute(interaction, true, [], client);
        }
        catch (error) {
            console.error(error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: `There was an error while executing this command! ${error.name}: ${error.message}` });
            }
            else {
                await interaction.reply({ content: `There was an error while executing this command! ${error.name}: ${error.message}` });
            }
        }
    }
});

// When the bot sees a message, it will analyse it for a prefix or if the sender is a bot.
// If the keyword after the prefix is a word in a command it will execute that specific command.
client.on(Events.MessageCreate, async (message) => {
    try {
	if (!message.content.toLowerCase().startsWith(prefix) || message.author.bot) return;

    // Split the arguments of a command and take the actual command from the arguments.
    const args = message.content.slice(prefix.length).split(/\s+/);
    const command = args.shift().toLowerCase();

    // Date.now is to last check when the player initiated a command
    const now = Date.now();

    // Determines whether or not the player has actually started or not... if they have, update energy with the Date.now previously mentioned.
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

    // Start - Keep in mind that the only reason this is here is because I'm a fucking idiot who can't bother coming up with a different solution
    // Think about it - if you allow somebody to use commands from the command files without starting, it creates many issues.
    // But if you DON'T let players access the command files until after starting their only method is through slash... it's easier this way.
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
                dojoStatus: '[]',
            });
            await message.reply('Congrats, you have now started!');
            return;
            }
            catch (error) {
                if (error.name === 'SequelizeUniqueConstraintError') {
                    await message.reply('Oops, it appears you already have started!');
                    return;
                }
            }
    }

    if (findplayer) {

        // Find the command in the command files.
        const slashCommand = await client.commands.get(command);

        // If it exists there, attempt to execute it as a text command with the supplied args (and the client in case the client needs to be called)
        if (slashCommand) {
            await slashCommand.execute(message, false, args, client);
            return;
        }

        // Any commands below this point will be abbreviations for text based commands (e.g bee profile abbreviated to bee p) OR the text-exclusive tester commands.
        // Keep in mind the actual command should have IDENTICAL function to the corresponding command file.

        // Profile
        if (command === 'p' || command === 'pr') {
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
                    await message.reply({ embeds: [profileembed] });
                }
                catch (error) {
                    await message.reply(`There was an error! ${error.name}: ${error.message}`);
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
                    await message.reply({ embeds: [profileembed] });
                }
                catch (error) {
                    if (error.name === 'TypeError') {
                        await message.reply('This player has not started!');
                    }
                    else if (error.name === 'DiscordAPIError[10013]') {
                        await message.reply('Please mention a player!');
                    }
                    else {
                        await message.reply(`There was an error! ${error.name}: ${error.message}`);
                        console.log(error);
                    }
                }
            }
        }

        // Inventory
        else if (command === 'i' || command === 'inv') {
            if (!args[0]) {
                try {
                    let text = '';
                    const findPlayerInven = await inventory.findAll({ where: { playerid: message.author.id } });
                    for (let count = 0; count < findPlayerInven.length; count++) {
                        const findItems = await items.findOne({ where: { itemid: findPlayerInven[count].dataValues.itemid } });
                        text += capitaliseWords(findItems.get('itemName')) + ':' + '  ' + findPlayerInven[count].get('itemAmount') + '\n';
                    }
                    if (text === '') {
                        text += 'No items here :( \n`Find` or `Buy` some.';
                    }
                    const invenembed = new EmbedBuilder()
                        .setColor(0xffe521)
                        .setAuthor({ name: `${message.author.displayName}'s inventory`, iconURL: message.author.displayAvatarURL() })
                        .setFooter({ text: beeFact() })
                        .addFields({ name: 'Inventory', value: 'This is your inventory. All of your items will appear here.' })
                        .addFields({ name: 'Items', value: `\n${text}` });
                    await message.reply({ embeds: [invenembed] });
                }
                catch (error) {
                    await message.reply(`There was an error! ${error.name}: ${error.message}`);
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
                    await message.reply({ embeds: [invenembed] });
                }
                catch (error) {
                    await message.reply(`There was an error! ${error.name}: ${error.message}`);
                    console.log(error);
                }
            }
        }

        // If it looks like the last comment is wrong, that's because it is... for now.
        // Reminder to port the rest of the commands to solely files UNLESS they have an abbreviation or gain one.
        // The rest of these commands did not have their own dedicated file at the time of making this comment...

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
                const findArea = await area.findOne({ where: { areaName: argsText } });
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
            let currentDojoStatus = JSON.parse(findplayer.get('dojoStatus'));
            if (subCommand === 'train') {
                const selectedBee = args[0];
                const skillType = args[1];
                const findBee = await playerbees.findOne({ where: { playerid: message.author.id, IBI: selectedBee } });
                if (currentDojoStatus.length > 0) { return message.channel.send('You already have a bee training in the dojo!'); }
                if (!findBee) { return message.channel.send('Please use a valid IBI.'); }
                const beeSkills = JSON.parse(findBee.get('skills'));
                if (beeSkills.length === 3) { return message.channel.send('This bee has the maximum amount of skills!'); }
                const findBeeInfo = await beelist.findOne({ where: { beeid: findBee.get('beeid') } });
                if (!skillType || skillType.toLowerCase() != 'passive' && skillType.toLowerCase() != 'active') { return message.channel.send('Please choose a valid skill type to learn (`passive or active`)'); }
                if (skillType === 'active') {
                    await message.channel.send(`**${message.author.username}** sent their **${capitaliseWords(findBeeInfo.get('beeName'))}** to the dojo to learn an ${args[1].toLowerCase()} skill!`);
                }
                else {
                    await message.channel.send(`**${message.author.username}** sent their **${capitaliseWords(findBeeInfo.get('beeName'))}** to the dojo to learn an ${args[1].toLowerCase()} skill!`);
                }
                currentDojoStatus.push(args[0]);
                currentDojoStatus.push(args[1]);
                currentDojoStatus.push(Date.now() + 7200000);
                currentDojoStatus = JSON.stringify(currentDojoStatus);
                findplayer.update({ dojoStatus: currentDojoStatus });
            }
            else if (subCommand === 'claim') {
                if (currentDojoStatus.length === 0) { return message.channel.send('You do not have a bee currently training!'); }
                if (currentDojoStatus[2] - Date.now() > 0) { return message.channel.send('Your bee is not finished training yet!'); }
                let skillFound = undefined;
                const findBee = await playerbees.findOne({ where: { playerid: message.author.id, IBI: currentDojoStatus[0] } });
                let findBeeSkills = JSON.parse(findBee.get('skills'));
                while (skillFound === undefined) {
                    const gradeNumber = Math.floor(Math.random() * 101);
                    if (gradeNumber <= gradeRarities['F']) { skillFound = await findCommand('F', 'skill', currentDojoStatus[1], findBeeSkills); }
                    else if (gradeNumber > gradeRarities['F'] && gradeNumber <= gradeRarities['E']) { skillFound = await findCommand('E', 'skill', currentDojoStatus[1], findBeeSkills); }
                    else if (gradeNumber > gradeRarities['E'] && gradeNumber <= gradeRarities['D']) { skillFound = await findCommand('D', 'skill', currentDojoStatus[1], findBeeSkills); }
                    else if (gradeNumber > gradeRarities['D'] && gradeNumber <= gradeRarities['C']) { skillFound = await findCommand('C', 'skill', currentDojoStatus[1], findBeeSkills); }
                    else if (gradeNumber > gradeRarities['C'] && gradeNumber <= gradeRarities['B']) { skillFound = await findCommand('B', 'skill', currentDojoStatus[1], findBeeSkills); }
                    else if (gradeNumber > gradeRarities['B'] && gradeNumber <= gradeRarities['A']) { skillFound = await findCommand('A', 'skill', currentDojoStatus[1], findBeeSkills); }
                    else if (gradeNumber === gradeRarities['S']) { skillFound = await findCommand('S', 'skill', currentDojoStatus[1], findBeeSkills); }
                }
                const findBeeInfo = await beelist.findOne({ where: { beeid: findBee.get('beeid') } });
                const skillembed = new EmbedBuilder()
                    .setColor(0xffe521)
                    .setAuthor({ name: `${message.author.displayName}'s bee's training`, iconURL: message.author.displayAvatarURL() })
                    .setFooter({ text: beeFact() })
                    .addFields({ name: `Your ${capitaliseWords(findBeeInfo.get('beeName'))} has learned a new skill!`, value: `${capitaliseWords(skillFound.get('skillName'))}` });
                await message.channel.send({ embeds: [skillembed] });
                findBeeSkills.push([skillFound.get('skillid'), 1]);
                findBeeSkills = JSON.stringify(findBeeSkills);
                findBee.update({ skills: findBeeSkills });
                currentDojoStatus = [];
                currentDojoStatus = JSON.stringify(currentDojoStatus);
                findplayer.update({ dojoStatus: currentDojoStatus });
            }
            else {
                let text;
                if (currentDojoStatus.length === 0) { text = '**No bee currently in training**'; }
                else if (currentDojoStatus[2] - Date.now() > 0) {
                    text = `**Training - ${await msToTime(currentDojoStatus[2] - Date.now())}**`;
                }
                else {
                    text = '**Training complete! Ready to claim.**';
                }
                const dojoEmbed = new EmbedBuilder()
                        .setColor(0xffe521)
                        .setAuthor({ name: 'The Dojo' })
                        .addFields({ name: 'Welcome to the dojo!',
                        value: `- Here, you can give bees new skills or improve existing skills! \n- These skills can provide passive buffs or special abilities that can be activated in battle. \n- Bees take time to train. \n- Only one bee can be trained at a time. \n\nCurrent training status: \n${text}` })
                        .setFooter({ text: beeFact() });
                await message.channel.send({ embeds: [dojoEmbed] });
            }
        }

        // Cave
        else if (command === 'cave') {
            const subCommand = args.shift();
            const findPlayerInven = await inventory.findAll({ where: { playerid: message.author.id } });
            if (subCommand === 'train') {
                const chosenIBI = args[0];
                const chosenType = args[1];
                if (!chosenType || chosenType != 'passive' && chosenType != 'active' && chosenType != 'hybrid' && chosenType != 'godly') { return message.channel.send('Please choose a valid type of skill (`passive`, `active`, or `hybrid`).'); }
                const findBee = await playerbees.findOne({ where: { playerid: message.author.id, IBI: chosenIBI } });
                if (!findBee) { return message.channel.send('Please use a valid IBI.'); }
                let beeSkills = JSON.parse(findBee.get('skills'));
                if (beeSkills.length === 3) { return message.channel.send('Your bee has the maximum amount of skills.'); }
                let skillFound = undefined;
                while (skillFound === undefined) {
                    const gradeNumber = Math.floor(Math.random() * 101);
                    if (gradeNumber <= gradeRarities['F']) { skillFound = await findCommand('F', 'skill', chosenType, beeSkills); }
                    else if (gradeNumber > gradeRarities['F'] && gradeNumber <= gradeRarities['E']) { skillFound = await findCommand('E', 'skill', chosenType, beeSkills); }
                    else if (gradeNumber > gradeRarities['E'] && gradeNumber <= gradeRarities['D']) { skillFound = await findCommand('D', 'skill', chosenType, beeSkills); }
                    else if (gradeNumber > gradeRarities['D'] && gradeNumber <= gradeRarities['C']) { skillFound = await findCommand('C', 'skill', chosenType, beeSkills); }
                    else if (gradeNumber > gradeRarities['C'] && gradeNumber <= gradeRarities['B']) { skillFound = await findCommand('B', 'skill', chosenType, beeSkills); }
                    else if (gradeNumber > gradeRarities['B'] && gradeNumber <= gradeRarities['A']) { skillFound = await findCommand('A', 'skill', chosenType, beeSkills); }
                    else if (gradeNumber === gradeRarities['S']) { skillFound = await findCommand('S', 'skill', chosenType, beeSkills); }
                }
                const findBeeInfo = beelist.findOne({ where: { beeid: findBee.get('beeid') } });
                const skillembed = new EmbedBuilder()
                    .setColor(0xffe521)
                    .setAuthor({ name: `${message.author.displayName}'s bee's training`, iconURL: message.author.displayAvatarURL() })
                    .setFooter({ text: beeFact() })
                    .addFields({ name: `Your ${capitaliseWords(findBeeInfo.get('beeName'))} has learned a new skill!`, value: `${capitaliseWords(skillFound.get('skillName'))}` });
                await message.channel.send(`${skillFound.get('skillid')}`);
                beeSkills.push([skillFound.get('skillid'), 1]);
                beeSkills = JSON.stringify(beeSkills);
                findBee.update({ skills: beeSkills });
            }
            else {
                const caveEmbed = new EmbedBuilder()
                    .setColor(0xffe521)
                    .setAuthor({ name: 'The Cave' })
                    .setFooter({ text: beeFact() })
                    .addFields({ name: 'The Training Cave',
                    value: '- The Training Cave is a way for your bees to learn, forget, and power up their skills. \n- Bees learn skills instantly here, at the cost of shards. \n- There are some skills that can only be learned here \n- Green shards are for passive skills \n- Red shards are for active skills \n- Purple shards are for exclusive hybrid skills \n- White shards help bees forget skills \n- Charged shards are for increasing the power of a bee\'s skills' });
                let invenText = '';
                for (const item in findPlayerInven) {
                    const findItem = await items.findOne({ where: { itemid: findPlayerInven[item].dataValues.itemid } });
                    if (findItem.get('itemName') != 'red crystal shard' && findItem.get('itemName') != 'green crystal shard' && findItem.get('itemName') != 'purple crystal shard' && findItem.get('itemName') != 'white crystal shard' && findItem.get('itemName') != 'charged crystal shard') { continue; }
                    invenText += `${capitaliseWords(findItem.get('itemName'))}: ${findPlayerInven[item].itemAmount}\n`;
                }
                caveEmbed.addFields({ name: 'Your Shards', value: `${invenText}` });
                await message.channel.send({ embeds: [caveEmbed] });
            }
        }

        // Fight
        else if (command === 'fight') {
            const playerBeeTeam = JSON.parse(findplayer.get('beeTeam'));
            const beeObjs = [];
            const playerActionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                .setCustomId('attack')
                .setLabel('Attack')
                .setStyle('Primary'),
            );
            let text = '';
            for (const bee in playerBeeTeam) {
                const findBee = await playerbees.findOne({ where: { IBI: playerBeeTeam[bee] } });
                const findBeeName = await beelist.findOne({ where: { beeid: findBee.get('beeid') } });
                text += `**${capitaliseWords(findBeeName.get('beeName'))}**\nPower: ${findBee.get('beePower')}\nHealth: ${findBee.get('beeHealth')}\n\n`;
            }
            const fightEmbed = new EmbedBuilder()
                .setColor(0xffe521)
                .setAuthor({ name: 'Fight!' })
                .addFields({ name: 'Enemy', value: `**Dummy**\nPower: 10\n▃▃▃▃▃▃▃\n\n **Your bees**\n\n${text}` });
            const fightMessage = await message.channel.send({ embeds: [fightEmbed], components: [playerActionRow] });
            const filter = (interaction) => interaction.user.id === message.author.id;
            const collector = fightMessage.createMessageComponentCollector({ filter, time: 90000 });
            collector.on('collect', async i => {
                if (!i.deferred) {
                    await i.deferUpdate();
                }
                if (i.customId === 'attack') {
                    turn(fightMessage, collector, filter, playerBeeTeam);
                }
            });
            collector.on('end', (collected, reason) => {
                if (reason === 'time') {
                    message.channel.send('Time\'s up! The game is over.');
                }
            });
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
    }
    catch (error) {
        await message.reply(`There was an error! ${error.name}: ${error.message}`);
        console.log(error);
    }
});

// Log in to Discord with your client's token
client.login(token);