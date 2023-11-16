const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize('database', 'user', 'password', {
    host: 'localhost',
    dialect: 'mysql',
    logging: false,
    storage: 'playerinfo.db',
});

const items = sequelize.define('items', {
    itemid: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    itemName: DataTypes.STRING,
    sellPrice: DataTypes.INTEGER,
    findType: DataTypes.STRING,
    findChance: DataTypes.INTEGER,
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

module.exports = {
	data: new SlashCommandBuilder()
		.setName('inventory')
		.setDescription('Check out your inventory.')
        .addUserOption(option => option.setName('user').setDescription('Check another player\'s inventory')),
	async execute(interaction) {
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
        function capitaliseWords(sentence) {
            return sentence.replace(/\b\w/g, char => char.toUpperCase());
        }
        const requestplayer = interaction.options.getUser('user');
        if (!requestplayer) {
            try {
                let text = '';
                const findPlayerInven = await inventory.findAll({ where: { playerid: interaction.user.id } });
                for (let count = 0; count < findPlayerInven.length; count++) {
                    const findItems = await items.findOne({ where: { itemid: findPlayerInven[count].dataValues.itemid } });
                    text += capitaliseWords(findItems.get('itemName')) + ':' + '  ' + findPlayerInven[count].get('itemAmount') + '\n';
                }
                if (text === '') {
                    text += 'No items here :( \nFind or buy some.';
                }
                const invenembed = new EmbedBuilder()
                    .setColor(0xffe521)
                    .setAuthor({ name: `${interaction.user.username}'s inventory`, iconURL: interaction.user.displayAvatarURL() })
                    .setFooter({ text: beeFact() })
                    .addFields({ name: 'Inventory', value: 'This is your inventory. All of your items will appear here.' })
                    .addFields({ name: 'Items', value: `\n${text}` });
                interaction.reply({ embeds: [invenembed] });
            }
            catch (error) {
                interaction.reply(`There was an error! ${error.name}: ${error.message}`);
                console.log(error);
            }
        }
        else {
            try {
                let text = '';
                const findPlayerInven = await inventory.findAll({ where: { playerid: requestplayer.id } });
                for (let count = 0; count < findPlayerInven.length; count++) {
                    const findItems = await items.findOne({ where: { itemid: findPlayerInven[count].dataValues.itemid } });
                    text += capitaliseWords(findItems.get('itemName')) + ':' + '  ' + findPlayerInven[count].get('itemAmount') + '\n';
                }
                if (text === '') {
                    text += 'No items here :(';
                }
                const invenembed = new EmbedBuilder()
                    .setColor(0xffe521)
                    .setAuthor({ name: `${requestplayer.username}'s inventory`, iconURL: requestplayer.displayAvatarURL() })
                    .setFooter({ text: beeFact() })
                    .addFields({ name: 'Inventory', value: 'This is your inventory. All of your items will appear here.' })
                    .addFields({ name: 'Items', value: `\n${text}` });
                interaction.reply({ embeds: [invenembed] });
            }
            catch (error) {
                interaction.reply(`There was an error! ${error.name}: ${error.message}`);
                console.log(error);
            }
        }
    },
};