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
        function beeFact() {
            const beeFacts = ['Bumble bees are apart of the apidae bee family.', 'The average bumble bee life span is 4 weeks.', 'The majority of bumble bee species in Europe seemingly like the colours violet or blue.',
            'A honey bee can fly up to 15 miles per hour.', 'Bees are relatives of ants!', 'Male drone bees don\'t have a stinger.', 'Bees have 5 eyes.', 'Bees struggle distinguishing red colours compared to bluer tones.',
            'Worker bees communicate with dancing or shaking their bodies.', 'A bee flaps it\'s wings 200x per second.', 'Bees can experience PTSD-like symptoms.', 'Bees recognize different human faces.',
            'Bees like humans who take care of them!', 'Bees are usually optimistic when successfully foraging, but can become depressed if momentarily trapped by a predatory spider.',
            'The Megachilidae Bee family has the most diverse nesting habits. They construct hives using mud, gravel, resin, plant fiber, wood pulp, and leaf pulp.', 'The Megachilidae bee family builds their nests in cavities, mainly in rotting wood, using leaves.',
            'The Andrenidae bee family is collectively known as mining bees. It consists of solitary bees that nest on the ground!', 'Halictidae bees are all ground-nesting bees with extremely diverse levels of sociality. Some species can even switch between being social or solitary depending on their environment.',
            'The Halictidae family also known as \'Sweet\' bees, because of their small size (4-8mm) these insects comprise some groups which are metallic in appearance.', 'The Stenotritidae bee family is the smallest of the seven bee families with 2 subfamilies and 21 species. The family is only found in Australia and closely related to Colletidae.'];
            const randomFact = Math.floor(Math.random() * 21);
            return beeFacts[randomFact];
        }
        try {
            let text = '';
            const shopItems = await beelist.findAll({ where: { findType: 'shop' } });
            for (let count = 0; count < shopItems.length; count++) {
                const findItems = await beelist.findOne({ where: { beeid: shopItems[count].dataValues.beeid } });
                text += capitaliseWords(findItems.get('beeName')) + ':' + '  ' + findItems.get('beePrice') + '\n';
            }
            const shopembed = new EmbedBuilder()
            .setColor(0xffe521)
            .setTitle('The Bee Shop')
            .setFooter({ text: beeFact() })
            .addFields({ name: '\u200b', value: 'Hello, welcome to the bee shop! Here you can buy bees that can work for you. These bees are really useful, so I think you should buy some.' + '\u200b' })
            .addFields({ name: 'Bees', value: `\n\n${text}` });
            interaction.reply({ embeds: [shopembed] });
        }
        catch (error) {
            interaction.reply(`There was an error! ${error.name}: ${error.message}`);
        }
    },
};