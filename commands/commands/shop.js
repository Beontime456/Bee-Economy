const { SlashCommandBuilder } = require('discord.js');
const { Sequelize, DataTypes } = require('sequelize');
const { EmbedBuilder } = require('discord.js');

const sequelize = new Sequelize('database', 'user', 'password', {
	host: 'localhost',
	dialect: 'sqlite',
	logging: false,
	storage: 'playerinfo.sqlite',
});

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
		.setName('shop')
		.setDescription('Check out the bee shop'),
	async execute(interaction) {
        function capitaliseWords(sentence) {
            return sentence.replace(/\b\w/g, char => char.toUpperCase());
        }
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
            interaction.reply({ embeds: [shopembed] });
        }
        catch (error) {
            interaction.reply(`There was an error! ${error.name}: ${error.message}`);
        }
    },
};