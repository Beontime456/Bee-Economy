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

module.exports = {
	data: new SlashCommandBuilder()
		.setName('profile')
		.setDescription('Check out your stats.')
        .addUserOption(option => option.setName('user').setDescription('Check another players stats')),
	async execute(interaction) {
        const requestplayer = interaction.options.getUser('user');
        if (requestplayer == undefined) {
            try {
                const findplayer = await playerinformation.findOne({ where: { playerid: interaction.user.id } });
                const profileembed = new EmbedBuilder()
                .setColor(0x2dbd54)
                .setFooter({ text: 'This is an unfinished version of the bot' })
                .setAuthor({ name: `${interaction.user.username}'s profile`, iconURL: interaction.user.displayAvatarURL() })
                .setThumbnail(interaction.user.displayAvatarURL())
                .addFields(
                    { name: 'Stats', value:
                    '\nMoney:moneybag:: ' + findplayer.get('money') });
                interaction.reply({ embeds: [profileembed] });
            }
            catch (error) {
                if (error.name === 'TypeError') {
                    interaction.reply('You need to start! Type bee start in order to start!');
                }
                else {
                    interaction.reply('There was an error!');
                }
            }
        }
        else {
            try {
                const findplayer = await playerinformation.findOne({ where: { playerid: requestplayer.id } });
                const profileembed = new EmbedBuilder()
                    .setColor(0x2dbd54)
                    .setAuthor({ name: `${requestplayer.username}'s profile`, iconURL: requestplayer.displayAvatarURL() })
                    .setFooter({ text: 'This is an unfinished version of the bot' })
                    .setThumbnail(requestplayer.displayAvatarURL())
                    .addFields(
                        { name: 'Stats', value:
                        '\nMoney :moneybag:: ' + findplayer.get('money') });
                interaction.reply({ embeds: [profileembed] });
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