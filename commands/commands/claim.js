const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
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
		.setName('claim')
		.setDescription('Claim any resources your bees may have found.'),
	async execute(interaction) {
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
        function capitaliseWords(sentence) {
            return sentence.replace(/\b\w/g, char => char.toUpperCase());
        }
        try {
            const findplayer = await playerinformation.findOne({ where: { playerid: interaction.user.id } });
            const claimTime = Date.now();
            const advTime = (claimTime - findplayer.get('lastAdvClaim')) / 1000 / 60;
            const moneyGained = Math.floor(Math.random() * 101 * advTime);
            const itemsAvailable = await items.findAll({ where: { findType: findplayer.get('area') } });
            let itemsGained = 0;
            let text = '';
            text += `Money: ${moneyGained}`;
            for (let count = 0; count < itemsAvailable.length; count++) {
                for (let i = 0; i < advTime; i++) {
                    if (Math.floor(Math.random() * itemsAvailable[count].dataValues.findChance) + 1 < itemsAvailable[count].dataValues.findChance) {
                        itemsGained++;
                    }
                }
                text += `\n${capitaliseWords(itemsAvailable[count].dataValues.itemName)}: ${itemsGained}`;
                const findInvenItem = await inventory.findOne({ where: { itemid: itemsAvailable[count].dataValues.itemid } });
                if (findInvenItem) {
                    findInvenItem.update({ itemAmount: findInvenItem.get('itemAmount') + itemsGained });
                }
                else {
                    await inventory.create({
                        playerid: interaction.user.id,
                        itemid: itemsAvailable[count].dataValues.itemid,
                        itemAmount: itemsGained,
                    });
                }
                itemsGained = 0;
            }
            const advembed = new EmbedBuilder()
                .setColor(0xffe521)
                .setAuthor({ name: `${interaction.user.username}'s adventuring results`, iconURL: interaction.user.displayAvatarURL() })
                .setFooter({ text: beeFact() })
                .addFields({ name: 'The bees are back!', value: `You lost 10 energy :zap: \nThe bees brought with them: \n\n${text}` });
            interaction.reply({ embeds: [advembed] });
            findplayer.update({ money: findplayer.get('money') + moneyGained, lastAdvClaim: claimTime, energy: findplayer.get('energy') - 10 });
        }
        catch (error) {
            if (error.name === 'TypeError') {
                interaction.reply('You haven\'t started yet! Use `bee start` to start.');
            }
            else {
                interaction.reply(`There was an error! ${error.name}: ${error.message}`);
                console.log(error);
            }
        }
    },
};