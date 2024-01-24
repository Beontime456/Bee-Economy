// Dependencies for command
const { SlashCommandBuilder } = require('discord.js');
const { Sequelize } = require('sequelize');

// Initialise connection with database
const sequelize = new Sequelize('database', 'user', 'password', {
    host: 'localhost',
    dialect: 'sqlite',
    logging: false,
    storage: 'playerinfo.sqlite',
});

// Open required tables for the command
const playerinformation = require('C:/Bee Economy/models/playerinformation.js')(sequelize, Sequelize.DataTypes);

playerinformation.sync();

module.exports = {
	data: new SlashCommandBuilder()
		.setName('start')
		.setDescription('Begin your journey.'),
	async execute(interaction, isSlash) {
        // Identify if a command was initiated through slash or text.
        let interactionAuth = undefined;
        if (isSlash) {
            interactionAuth = interaction.user;
        }
        else {
            interactionAuth = interaction.author;
        }
        try {
            // Create a record for the player in the database.
            await playerinformation.create({
                playerid: interactionAuth.id,
                money: 500,
                beeSlots: 6,
                energy: 200,
                lastEnergyRegen: null,
                lastAdvClaim: Date.now(),
                area: 'backyard',
                currentQuest: 0,
                beeTeam: '[]',
                dojoStatus: '[]',
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