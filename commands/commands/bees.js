const { SlashCommandBuilder } = require('discord.js');
const { Sequelize, DataTypes } = require('sequelize');
const { EmbedBuilder } = require('discord.js');

const sequelize = new Sequelize('database', 'user', 'password', {
	host: 'localhost',
	dialect: 'sqlite',
	logging: false,
	storage: 'playerinfo.sqlite',
});

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
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    beeName: {
        type: DataTypes.STRING,
    },
    beeBaseRarity: DataTypes.STRING,
    findType: DataTypes.STRING,
    beePrice: DataTypes.INTEGER,
}, {
        timestamps: false,
    });
beelist.sync();

module.exports = {
	data: new SlashCommandBuilder()
		.setName('bees')
		.setDescription('Check out your bees')
        .addUserOption(option => option.setName('user').setDescription('Check another player\'s bees')),
	async execute(interaction) {
        function capitaliseWords(sentence) {
            return sentence.replace(/\b\w/g, char => char.toUpperCase());
        }
        const requestplayer = interaction.options.getUser('user');
        if (requestplayer == undefined) {
            try {
                const findPlayerBees = await playerbees.findAll({ where: { playerid: interaction.user.id } });
                const findplayer = await playerinformation.findOne({ where: { playerid: interaction.user.id } });
                const beeFields = [];
                for (let count = 0; count < findPlayerBees.length; count++) {
                    const nextBee = await beelist.findOne({ where: { beeid: findPlayerBees[count].dataValues.beeid } });
                    beeFields.push({ name: capitaliseWords(nextBee.get('beeName')), value: capitaliseWords(findPlayerBees[count].dataValues.beeRarity), inline: true });
                }
                if (beeFields.length === 0) {
                    beeFields.push({ name: '\u200b', value: 'You have no bees :( \n Buy some at the shop (bee shop)' });
                }
                const beeembed = new EmbedBuilder()
                    .setColor(0xffe521)
                    .setAuthor({ name: `${interaction.user.username}'s profile`, iconURL: interaction.user.displayAvatarURL() })
                    .setFooter({ text: 'This is an unfinished version of the bot' })
                    .addFields(
                        { name: 'Bees', value: `These are all your bees. They will do various things for you, and are very useful to you. \n\nBee slots: ${await playerbees.count({ where: { playerid: interaction.user.id } })}/${findplayer.get('beeSlots')}` },
                    );
                for (let count = 0; count < beeFields.length; count++) {
                    beeembed.addFields(beeFields[count]);
                }
                interaction.reply({ embeds: [beeembed] });
            }
            catch (error) {
                if (error.name === 'TypeError') {
                    await interaction.reply('You haven\'t started yet! Use bee start to start!');
                }
                else {
                    await interaction.reply(`There was an error! ${error.name}: ${error.message}`);
                }
            }
        }
        else {
            try {
                const findPlayerBees = await playerbees.findAll({ where: { playerid: requestplayer.id } });
                const findplayer = await playerinformation.findOne({ where: { playerid: requestplayer.id } });
                    const beeFields = [];
                    for (let count = 0; count < findPlayerBees.length; count++) {
                        const nextBee = await beelist.findOne({ where: { beeid: findPlayerBees[count].dataValues.beeid } });
                        beeFields.push({ name: capitaliseWords(nextBee.get('beeName')), value: capitaliseWords(findPlayerBees[count].dataValues.beeRarity), inline: true });
                    }
                    if (beeFields.length === 0) {
                        beeFields.push({ name: '\u200b', value: 'This person has no bees :(' });
                    }
                    const beeembed = new EmbedBuilder()
                        .setColor(0xffe521)
                        .setAuthor({ name: `${requestplayer.username}'s profile`, iconURL: requestplayer.displayAvatarURL() })
                        .setFooter({ text: 'This is an unfinished version of the bot' })
                        .addFields(
                            { name: 'Bees', value: `These are all of this person's bees. They will do various things for you, and are very useful to you. \n\nBee slots: ${await playerbees.count({ where: { playerid: requestplayer.id } })}/${findplayer.get('beeSlots')}` },
                        );
                    for (let count = 0; count < beeFields.length; count++) {
                        beeembed.addFields(beeFields[count]);
                    }
                    interaction.reply({ embeds: [beeembed] });
            }
            catch (error) {
                if (error.name === 'TypeError') {
                    interaction.reply('This player has not started!');
                }
                else {
                    interaction.reply(`There was an error! ${error.name}: ${error.message}`);
                }
            }
        }
    },
};
