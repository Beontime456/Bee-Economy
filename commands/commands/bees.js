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
    energy: DataTypes.INTEGER,
    lastEnergyRegen: DataTypes.INTEGER,
    lastAdvClaim: DataTypes.INTEGER,
    area: DataTypes.STRING,
}, {
        timestamps: false,
    });
playerinformation.sync();

const playerbees = sequelize.define('playerbees', {
    playerid: DataTypes.STRING,
    IBI: DataTypes.INTEGER,
    beeid: DataTypes.INTEGER,
    beeLevel: DataTypes.INTEGER,
    beeTier: DataTypes.INTEGER,
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
    beeGrade: DataTypes.STRING,
    beeBaseTier: DataTypes.INTEGER,
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
        const requestplayer = interaction.options.getUser('user');
        if (requestplayer == undefined) {
            try {
                const findplayer = await playerinformation.findOne({ where: { playerid: interaction.user.id } });
                const findPlayerBees = await playerbees.findAll({ where: { playerid: interaction.user.id }, order: sequelize.literal('IBI ASC') });
                    const beeFields = [];
                    for (let count = 0; count < findPlayerBees.length; count++) {
                        const nextBee = await beelist.findOne({ where: { beeid: findPlayerBees[count].dataValues.beeid } });
                        beeFields.push({ name: `\`IBI: ${findPlayerBees[count].dataValues.IBI}\` ${capitaliseWords(nextBee.get('beeName'))}`, value: `Grade: ${nextBee.get('beeGrade')} \nTier: ${findPlayerBees[count].dataValues.beeTier} \nLevel: ${findPlayerBees[count].dataValues.beeLevel}`, inline: true });
                    }
                    if (beeFields.length === 0) {
                        beeFields.push({ name: '\u200b', value: 'You have no bees :( \n Buy some at the shop (bee shop)' });
                    }
                    const beeembed = new EmbedBuilder()
                        .setColor(0xffe521)
                        .setAuthor({ name: `${interaction.user.username}'s bees`, iconURL: interaction.user.displayAvatarURL() })
                        .setFooter({ text: beeFact() })
                        .addFields(
                            { name: 'Bees', value: `These are all your bees. They will do various things for you, and are very useful to you. \nIBI stands for Individual Bee Identifier and should be used when selling or doing other actions on specific bees. \n\nBee slots: ${await playerbees.count({ where: { playerid: interaction.user.id } })}/${findplayer.get('beeSlots')}` },
                        );
                    for (let count = 0; count < beeFields.length; count++) {
                        beeembed.addFields(beeFields[count]);
                    }
                    await interaction.reiply({ embeds: [beeembed] });
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
                const findPlayerBees = await playerbees.findAll({ where: { playerid: requestplayer.id }, order: sequelize.literal('IBI ASC') });
                const findplayer = await playerinformation.findOne({ where: { playerid: requestplayer.id } });
                const beeFields = [];
                for (let count = 0; count < findPlayerBees.length; count++) {
                    const nextBee = await beelist.findOne({ where: { beeid: findPlayerBees[count].dataValues.beeid } });
                    beeFields.push({ name: `\`IBI: ${findPlayerBees[count].dataValues.IBI}\` ${capitaliseWords(nextBee.get('beeName'))}`, value: `Grade: ${nextBee.get('beeGrade')} \nTier: ${findPlayerBees[count].dataValues.beeTier} \nLevel: ${findPlayerBees[count].dataValues.beeLevel}`, inline: true });
                }
                if (beeFields.length === 0) {
                    beeFields.push({ name: '\u200b', value: 'This person has no bees :(' });
                }
                const beeembed = new EmbedBuilder()
                    .setColor(0xffe521)
                    .setAuthor({ name: `${requestplayer.username}'s bees`, iconURL: requestplayer.displayAvatarURL() })
                    .setFooter({ text: beeFact() })
                    .addFields(
                        { name: 'Bees', value: `These are all this person's bees. They will do various things for you, and are very useful to you. \nIBI stands for Individual Bee Identifier and should be used when selling or doing other actions on specific bees. \n\nBee slots: ${await playerbees.count({ where: { playerid: findplayer.id } })}/${findplayer.get('beeSlots')}` },
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
