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
                const profileembed = new EmbedBuilder()
                .setColor(0xffe521)
                .setFooter({ text: beeFact() })
                .setAuthor({ name: `${interaction.user.username}'s profile`, iconURL: interaction.user.displayAvatarURL() })
                .setThumbnail(interaction.user.displayAvatarURL())
                .addFields(
                    { name: 'Stats', value:
                    `\nMoney :moneybag:: ${findplayer.get('money')}` +
                    `\nBee Slots :bee:: ${findplayer.get('beeSlots')}`,
                });
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
                    .setColor(0xffe521)
                    .setAuthor({ name: `${requestplayer.username}'s profile`, iconURL: requestplayer.displayAvatarURL() })
                    .setFooter({ text: beeFact() })
                    .setThumbnail(requestplayer.displayAvatarURL())
                    .addFields(
                        { name: 'Stats', value:
                        `\nMoney :moneybag:: ${findplayer.get('money')}` +
                        `\nBee Slots :bee:: ${findplayer.get('beeSlots')}`,
                });
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