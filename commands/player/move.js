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
const area = require('C:/Bee Economy/models/area.js')(sequelize, Sequelize.DataTypes);

playerinformation.sync();
area.sync();

module.exports = {
	data: new SlashCommandBuilder()
		.setName('move')
		.setDescription('Move to a different area.')
		.addStringOption(option =>
            option.setName('area')
                .setDescription('The area you want to move to')
                .setRequired(true),
        ),
	async execute(interaction, isSlash, args) {
		// Identify if a command was initiated through slash or text.
        let interactionAuth = undefined;
		let chosenArea = undefined;
        if (isSlash) {
            interactionAuth = interaction.user;
			chosenArea = interaction.options.getString('area');
        }
        else {
            interactionAuth = interaction.author;
			chosenArea = args.join(' ').toLowerCase();
        }
		try {
			const findplayer = await playerinformation.findOne({ where: { playerid: interactionAuth.id } });
			const findArea = await area.findOne({ where: { areaName: chosenArea } });
			if (!findArea) { return interaction.reply('This is not an area you can move your hive to!'); }
			if (findplayer.get('currentQuest') < findArea.get('areaid') - 1) { return interaction.reply('You need to complete some more quests to move to this area!'); }
			if (findplayer.get('area') === findArea.get('areaName')) { return interaction.reply('You\'re already in this area!'); }
			await interaction.reply(`You migrated your hive to the ${findArea.get('areaName')}!`);
			await findplayer.update({ area: findArea.get('areaName') });
		}
		catch (error) {
			await interaction.reply(`There was an error! ${error.name}: ${error.message}`);
			console.log(error);
		}
	},
};