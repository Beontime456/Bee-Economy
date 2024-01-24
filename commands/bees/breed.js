// Use required dependencies in the command
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Sequelize } = require('sequelize');

// Initialise connection to the database
const sequelize = new Sequelize('database', 'user', 'password', {
    host: 'localhost',
    dialect: 'sqlite',
    logging: false,
    storage: 'playerinfo.sqlite',
});

// Use required tables for the command
const playerinformation = require('C:/Bee Economy/models/playerinformation.js')(sequelize, Sequelize.DataTypes);
const playerbees = require('C:/Bee Economy/models/playerbees.js')(sequelize, Sequelize.DataTypes);
const beelist = require('C:/Bee Economy/models/beelist.js')(sequelize, Sequelize.DataTypes);

playerinformation.sync();
playerbees.sync();
beelist.sync();

// Required functions
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
    const randomFact = Math.floor(Math.random() * 20);
    return beeFacts[randomFact];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('breed')
        .setDescription('Choose one of your bees to create a new bee and retire.')
        .addStringOption(option =>
            option.setName('ibi')
                .setDescription('The IBI of the bee you want to breed')
                .setRequired(true),
        ),
        async execute(interaction, isSlash, args) {
            // Determine if a command was executed through slash or text
            // and with that info determine how the required arguments were inputted
            let chosenBee = undefined;
            let interactionAuth = undefined;
            if (isSlash) {
                interactionAuth = interaction.user;
                chosenBee = interaction.options.getString('ibi');
            }
            else {
                interactionAuth = interaction.author;
                chosenBee = args[0];
            }
            try {
                const findplayer = await playerinformation.findOne({ where: { playerid: interactionAuth.id } });
                const findBee = await playerbees.findOne({ where: { IBI: chosenBee, playerid: interactionAuth.id } });
                if (!findBee) { return interaction.reply('This is not an IBI associated with a bee you own!'); }
                if (findBee.get('beeTier') + 1 > 10) { return interaction.reply('This bee is at the max tier!'); }
                if (findplayer.get('energy') - 50 < 0) { return interaction.reply('You do not have enough energy to breed your bees! Rest for a while then try again.'); }
                const tierRoll = Math.floor(Math.random() * 100);
                let breedTier = 0;
                if (tierRoll <= Math.floor(100 / findBee.get('beeTier') * findBee.get('tierUpMod'))) {
                    breedTier += findBee.get('beeTier') + 1;
                    findBee.update({ tierUpMod: 1, beePower: findBee.get('beePower') * 1.5 });
                }
                else {
                    breedTier = findBee.get('beeTier');
                    findBee.update({ tierUpMod: findBee.get('tierUpMod') + 0.05 });
                }
                const findBeeName = await beelist.findOne({ where: { beeid: findBee.get('beeid') } });
                const breedEmbed = new EmbedBuilder()
                .setColor(0xffe521)
                .setAuthor({ name: `${interactionAuth.displayName}'s breeding results`, iconURL: interactionAuth.displayAvatarURL() })
                .setFooter({ text: beeFact() })
                .addFields({ name: `Your ${capitaliseWords(findBeeName.get('beeName'))} had an egg!`, value: `\n${capitaliseWords(findBeeName.get('beeName'))} \nTier: ${breedTier}` });
                await interaction.reply({ embeds: [breedEmbed] });
                findBee.update({ beeTier: breedTier });
                findplayer.update({ energy: findplayer.get('energy') - 50 });
            }
            catch (error) {
                await interaction.reply(`There was an error! ${error.name}: ${error.message}`);
                console.log(error);
            }
        },
};