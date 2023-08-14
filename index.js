// Require the necessary classes for the bot to function
const { Client, Events, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { token } = require('./config.json');
const { Sequelize, DataTypes } = require('sequelize');

// Create a new client instance
const client = new Client({ intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    ] });

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
}, {
        timestamps: false,
    });
playerinformation.sync();

const playerbees = sequelize.define('playerbees', {
    playerid: DataTypes.STRING,
    beeid: DataTypes.INTEGER,
    beeRarity: DataTypes.STRING,
}, {
        timestamps: false,
    });
playerbees.sync();

const beelist = sequelize.define('beelist', {
    beeid: {
        type: DataTypes.STRING,
        primaryKey: true,
    },
    beeName: {
        type: DataTypes.STRING,
        primaryKey: true,
    },
    beeBaseRarity: DataTypes.STRING,
    findType: DataTypes.STRING,
    beePrice: DataTypes.INTEGER,
}, {
        timestamps: false,
    });
beelist.sync();


// Initialise a prefix for the bot to see message commands
const prefix = 'bee ';

// Some basic universal functions to be used for several commands.
function capitaliseWords(sentence) {
    return sentence.replace(/\b\w/g, char => char.toUpperCase());
}

// When the client is ready, run this code (only once)
// We use 'c' for the event parameter to keep it separate from the already defined 'client'
client.once(Events.ClientReady, c => {
	console.log(`Ready! Logged in as ${c.user.tag}`);
});

// When the bot sees a message, it will analyse it for a prefix or if the sender is a bot.
// If the keyword after the prefix is a word in a command it will execute that specific command.
client.on('messageCreate', async (message) => {
	if (!message.content.toLowerCase().startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).split(/\s+/);
    const command = args.shift().toLowerCase();

    if (command === 'start') {
        try {
            await playerinformation.create({
                playerid: message.author.id,
                money: 500,
                beeSlots: 6,
            });
            await message.channel.send('Congrats, you have now started!');
            }
            catch (error) {
                if (error.name === 'SequelizeUniqueConstraintError') {
                    await message.channel.send('Oops, it appears you already have started!');
                }
            }
    }
    else if (command === 'profile') {
        if (!args[0]) {
            try {
                const findplayer = await playerinformation.findOne({ where: { playerid: message.author.id } });
                const profileembed = new EmbedBuilder()
                .setColor(0x2dbd54)
                .setFooter({ text: 'This is an unfinished version of the bot' })
                .setAuthor({ name: `${message.author.username}'s profile`, iconURL: message.author.displayAvatarURL() })
                .setThumbnail(message.author.displayAvatarURL())
                .addFields(
                    { name: 'Stats', value:
                    '\nMoney:moneybag:: ' + findplayer.get('money') });
                await message.channel.send({ embeds: [profileembed] });
            }
            catch (error) {
                if (error.name === 'TypeError') {
                    await message.channel.send('You need to start! Type bee start in order to start!');
                }
                else {
                    await message.channel.send('There was an error!');
                }
            }
        }
        else if (args[0]) {
            try {
                const mentionId = args[0].replace(/[\\<>@#&!]/g, '');
                const findplayer = await playerinformation.findOne({ where: { playerid: mentionId } });
                const profileUser = await client.users.fetch(mentionId);
                const profileembed = new EmbedBuilder()
                    .setColor(0x2dbd54)
                    .setAuthor({ name: `${profileUser.username}'s profile`, iconURL: profileUser.displayAvatarURL() })
                    .setFooter({ text: 'This is an unfinished version of the bot' })
                    .setThumbnail(profileUser.displayAvatarURL())
                    .addFields(
                        { name: 'Stats', value:
                        '\nMoney :moneybag:: ' + findplayer.get('money') });
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
                }
            }
        }
    }
    else if (command === 'bees') {
            if (!args[0]) {
                try {
                    const findPlayerBees = await playerbees.findAll({ where: { playerid: message.author.id } });
                    const findplayer = await playerinformation.findOne({ where: { playerid: message.author.id } });
                    const beeFields = [];
                    for (let count = 0; count < findPlayerBees.length; count++) {
                        const nextBee = await beelist.findOne({ where: { beeid: findPlayerBees[count].dataValues.beeid } });
                        beeFields.push({ name: capitaliseWords(nextBee.get('beeName')), value: capitaliseWords(findPlayerBees[count].dataValues.beeRarity), inline: true });
                    }
                    if (beeFields.length === 0) {
                        beeFields.push({ name: '\u200b', value: 'You have no bees :( \n Buy some at the shop (bee shop)' });
                    }
                    const beeembed = new EmbedBuilder()
                        .setColor(0x2dbd54)
                        .setAuthor({ name: `${message.author.username}'s profile`, iconURL: message.author.displayAvatarURL() })
                        .setFooter({ text: 'This is an unfinished version of the bot' })
                        .addFields(
                            { name: 'Bees', value: `These are all your bees. They will do various things for you, and are very useful to you. \n\nBee slots: ${await playerbees.count({ where: { playerid: message.author.id } })}/${findplayer.get('beeSlots')}` },
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
                    }
                }
            }
            else {
                try {
                    const mentionId = args[0].replace(/[\\<>@#&!]/g, '');
                    const targetUser = await client.users.fetch(mentionId);
                    const findPlayerBees = await playerbees.findAll({ where: { playerid: targetUser.id } });
                    const findplayer = await playerinformation.findOne({ where: { playerid: targetUser.id } });
                        const beeFields = [];
                        for (let count = 0; count < findPlayerBees.length; count++) {
                            const nextBee = await beelist.findOne({ where: { beeid: findPlayerBees[count].dataValues.beeid } });
                            beeFields.push({ name: capitaliseWords(nextBee.get('beeName')), value: capitaliseWords(findPlayerBees[count].dataValues.beeRarity), inline: true });
                        }
                        if (beeFields.length === 0) {
                            beeFields.push({ name: '\u200b', value: 'This person has no bees :(' });
                        }
                        const beeembed = new EmbedBuilder()
                            .setColor(0x2dbd54)
                            .setAuthor({ name: `${targetUser.username}'s profile`, iconURL: targetUser.displayAvatarURL() })
                            .setFooter({ text: 'This is an unfinished version of the bot' })
                            .addFields(
                                { name: 'Bees', value: `These are all your bees. They will do various things for you, and are very useful to you. \n\nBee slots: ${await playerbees.count({ where: { playerid: targetUser.id } })}/${findplayer.get('beeSlots')}` },
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
                    }
                }
            }
    }
    else if (command === 'shop') {
        try {
            let text = '';
            const shopItems = await beelist.findAll({ where: { findType: 'shop' } });
            for (let count = 0; count < shopItems.length; count++) {
                const findItems = await beelist.findOne({ where: { beeid: shopItems[count].dataValues.beeid } });
                text += capitaliseWords(findItems.get('beeName')) + ':' + '  ' + findItems.get('beePrice') + '\n';
            }
            const shopembed = new EmbedBuilder()
            .setColor(0x2dbd54)
            .setTitle('The Bee Shop')
            .setFooter({ text: 'This is an unfinished version of the bot' })
            .addFields({ name: '\u200b', value: 'Hello, welcome to the bee shop! Here you can buy bees that can work for you. These bees are really useful, so I think you should buy some.' + '\u200b' })
            .addFields({ name: 'Bees', value: `\n\n${text}` });
        await message.channel.send({ embeds: [shopembed] });
        }
        catch (error) {
            await message.channel.send('There was an error!');
            console.log(error);
        }
    }
    else if (command === 'buy') {
        try {
            const findplayer = await playerinformation.findOne({ where: { playerid: message.author.id } });
            if (findplayer != null) {
                const argsText = args.join(' ').toLowerCase();
                const findBee = await beelist.findOne({ where: { beeName: argsText, findType: 'shop' } });
                if (findplayer.get('money') >= findBee.get('beePrice')) {
                    if (findplayer.get('beeSlots') > await playerbees.count({ where: { playerid: message.author.id } })) {
                        await playerbees.create({
                            playerid: message.author.id,
                            beeid: findBee.get('beeid'),
                            beeRarity: findBee.get('beeBaseRarity'),
                        });
                        await findplayer.update({ money: findplayer.get('money') - findBee.get('beePrice') });
                        await message.channel.send(`Bought the ${capitaliseWords(findBee.get('beeName'))}!`);
                    }
                    else {
                        await message.channel.send('You don\'t have enough bee slots for another bee! Get some more bozo');
                    }
                }
                else {
                    await message.channel.send('You are too poor lmao');
                }
            }
            else {
                message.channel.send('You have not started yet! Use bee start to start.');
            }
        }
        catch (error) {
            if (error.name === 'TypeError') {
                await message.channel.send('This isn\'t a buyable kind of bee!');
            }
            else {
                await message.channel.send(`There was an error! ${error.name}: ${error.message}`);
            }
        }
    }
});

// Log in to Discord with your client's token
client.login(token);