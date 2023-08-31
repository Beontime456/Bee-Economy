const { SlashCommandBuilder } = require('discord.js');
const { Sequelize, DataTypes } = require('sequelize');

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
    energy: DataTypes.INTEGER,
    lastEnergyRegen: DataTypes.INTEGER,
    lastAdvClaim: DataTypes.INTEGER,
    area: DataTypes.STRING,
}, {
        timestamps: false,
    });
playerinformation.sync();

module.exports = {
	data: new SlashCommandBuilder()
		.setName('start')
		.setDescription('Begin your journey.'),
	async execute(interaction) {
        try {
            await playerinformation.create({
                playerid: interaction.user.id,
                money: 500,
                beeSlots: 6,
                energy: 200,
                lastEnergyRegen: null,
                lastAdvClaim: Date.now(),
                area: 'backyard',
            });
            interaction.reply('Congrats, you have now started!');
            }
            catch (error) {
                if (error.name === 'SequelizeUniqueConstraintError') {
                    interaction.reply('Oops, it appears you already have started!');
                }
        }
    },
};