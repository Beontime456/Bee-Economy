// Dependencies for command
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
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

// Function for footer of an embed.
function beeFact() {
    const beeFacts = ['Bumble bees are apart of the apidae bee family.', 'The average bumble bee life span is 4 weeks.', 'The majority of bumble bee species in Europe seemingly like the colours violet or blue.',
    'A honey bee can fly up to 15 miles per hour.', 'Bees are relatives of ants!', 'Male drone bees don\'t have a stinger.', 'Bees have 5 eyes.', 'Bees struggle distinguishing red colours compared to bluer tones.',
    'Worker bees communicate with dancing or shaking their bodies.', 'A bee flaps it\'s wings 200x per second.', 'Bees can experience PTSD-like symptoms.', 'Bees recognize different human faces.',
    'Bees like humans who take care of them!', 'Bees are usually optimistic when successfully foraging, but can become depressed if momentarily trapped by a predatory spider.',
    'The Megachilidae Bee family has the most diverse nesting habits. They construct hives using mud, gravel, resin, plant fiber, wood pulp, and leaf pulp.', 'The Megachilidae bee family builds their nests in cavities, mainly in rotting wood, using leaves.',
    'The Andrenidae bee family is collectively known as mining bees. It consists of solitary bees that nest on the ground!'];
    const randomFact = Math.floor(Math.random() * beeFacts.length);
    return beeFacts[randomFact];
}
// Function to capitalise the first letter in each word of a given phrase.
function capitaliseWords(sentence) {
    return sentence.replace(/\b\w/g, char => char.toUpperCase());
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('profile')
		.setDescription('Check out your stats.')
        .addUserOption(option => option.setName('user').setDescription('Check another players stats')),
	async execute(interaction, isSlash, args, client) {
        // Checks if the command was initiated through slash or text.
        let requestplayer = undefined;
        let interactionAuth = undefined;
        if (!isSlash) {
            let userid = interaction.author.id;
            if (args.length > 0) {
                userid = args[0];
            }
            const mentionId = userid.replace(/[\\<>@#&!]/g, '');
            requestplayer = await client.users.fetch(mentionId);
            interactionAuth = interaction.author;
        }

        else {
            requestplayer = interaction.options.getUser('user');
            interactionAuth = interaction.user;
        }
        // Identify if the user supplied an argument for a userid or user mention.
        if (requestplayer == undefined) {
            try {
                // Creates the player embed, displaying important info about the player
                const findplayer = await playerinformation.findOne({ where: { playerid: interactionAuth.id } });
                const profileembed = new EmbedBuilder()
                .setColor(0xffe521)
                .setFooter({ text: beeFact() })
                .setAuthor({ name: `${interactionAuth.displayName}'s profile`, iconURL: interactionAuth.displayAvatarURL() })
                .setThumbnail(interactionAuth.displayAvatarURL())
                .addFields(
                    { name: 'Stats', value:
                    `\nMoney: ${findplayer.get('money')}` +
                    `\nBee Slots: ${findplayer.get('beeSlots')}` +
                    `\nArea: ${capitaliseWords(findplayer.get('area'))}` +
                    `\nEnergy: ${findplayer.get('energy')}`,
                });
                interaction.reply({ embeds: [profileembed] });
            }
            catch (error) {
                if (error.name === 'TypeError') {
                    interaction.reply('You need to start! Type bee start in order to start!');
                    console.log(error);
                }
                else {
                    interaction.reply('There was an error!');
                }
            }
        }
        else {
            try {
                // Creates the player embed, displaying important info about another player
                const findTarget = await playerinformation.findOne({ where: { playerid: requestplayer.id } });
                const profileembed = new EmbedBuilder()
                    .setColor(0xffe521)
                    .setAuthor({ name: `${requestplayer.displayName}'s profile`, iconURL: requestplayer.displayAvatarURL() })
                    .setFooter({ text: beeFact() })
                    .setThumbnail(requestplayer.displayAvatarURL())
                    .addFields(
                        { name: 'Stats', value:
                        `\nMoney: ${findTarget.get('money')}` +
                        `\nBee Slots: ${findTarget.get('beeSlots')}` +
                        `\nArea: ${capitaliseWords(findTarget.get('area'))}` +
                        `\nEnergy: ${findTarget.get('energy')}`,
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