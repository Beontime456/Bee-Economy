// Required dependencies
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Sequelize } = require('sequelize');

// Initialise connection to the database
const sequelize = new Sequelize('database', 'user', 'password', {
    host: 'localhost',
    dialect: 'sqlite',
    logging: false,
    storage: 'playerinfo.sqlite',
});

// NOTE - This command needs to be partially reworked for upcoming mechanics along with breed. Power will be calculated on the use of a command that requires it instead of being additively stacked.

// Required tables
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
        .setName('train')
        .setDescription('Train a bee using money to increase it\'s level!')
        .addStringOption(option =>
            option.setName('ibi')
                .setDescription('The IBI of the bee you want to train')
                .setRequired(true),
        )
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('How many levels you want the bee to be trained')
                .setMaxValue(150),
        ),
        async execute(interaction, isSlash, args) {
            // Determine if a command was executed through slash or text
            // and with that info determine how the required arguments were inputted
            let chosenBee = undefined;
            let lastArg = undefined;
            let interactionAuth = undefined;
            if (isSlash) {
                interactionAuth = interaction.user;
                chosenBee = interaction.options.getString('ibi');
                lastArg = interaction.options.getInteger('amount');
                if (!lastArg) {
                    lastArg = 1;
                }
            }
            else {
                interactionAuth = interaction.author;
                chosenBee = args.shift();
                lastArg = args[args.length - 1];
                if (typeof parseInt(lastArg) === 'number' && Number.isNaN(parseInt(lastArg)) != true) {
                    args.pop();
                    lastArg = parseInt(lastArg);
                }
                else if (!lastArg) {
                    lastArg = 1;
                }
                else if (lastArg.toLowerCase() === 'all') {
                    args.pop();
                    lastArg = 'all';
                }
            }
            // Attempts to find the IBI of the player's bee and the player themselves
            try {
                const findplayer = await playerinformation.findOne({ where: { playerid: interactionAuth.id } });
                const findBee = await playerbees.findOne({ where: { IBI: chosenBee, playerid: interactionAuth.id } });
                if (!findBee) { return interaction.reply('This is not an IBI associated with a bee you own!'); }
                if (findBee.get('beeLevel') + lastArg > 150) { return interaction.reply('This will train the bee over the level cap.'); }
                const findBeeName = await beelist.findOne({ where: { beeid: findBee.get('beeid') } });
                // After checking all conditions, calculate how much money is required to train a bee
                // This is done through a formula that adds 500 coins per level and adds 67% more to it.
                // This is done for every level from the initial level of the bee before this command up to the level of the bee + how many levels it is being trained.
                let totalMoney = 0;
                for (let count = findBee.get('beeLevel'); count < findBee.get('beeLevel') + lastArg; count++) {
                    totalMoney += (500 * count) * 1.67;
                }
                // Checks to make sure that the player has enough money and if they want their bee trained a singular time or several
                // Training a bee more than one level in a single command results in a confirmation embed with the amount of money being spent.
                if (lastArg > 1 && findplayer.get('money') >= totalMoney) {
                    const row = new ActionRowBuilder()
                        .addComponents([
                            new ButtonBuilder()
                                .setCustomId('confirm')
                                .setLabel('Yes')
                                .setStyle(ButtonStyle.Success),
                            new ButtonBuilder()
                                .setCustomId('deny')
                                .setLabel('No')
                                .setStyle(ButtonStyle.Danger),
                        ]);
                    const confirmembed = new EmbedBuilder()
                        .setColor(0xffe521)
                        .setFooter({ text: beeFact() })
                        .addFields({ name: `Are you sure you want to train this bee ${lastArg} times?`, value: `Doing so will cost ${totalMoney} money` });
                    const confirmMessage = await interaction.reply({ embeds: [confirmembed], components: [row] });
                    const collectorFilter = i => i.user.id === interactionAuth.id;
                    const collector = await interaction.channel.awaitMessageComponent({ filter: collectorFilter, time: 20000 });
                    if (collector.customId === 'confirm') {
                        confirmMessage.edit({ content: `Trained your ${capitaliseWords(findBeeName.get('beeName'))} for ${totalMoney} money! Your ${capitaliseWords(findBeeName.get('beeName'))}'s level increased by ${lastArg}!`, embeds: [], components: [] });
                        await findplayer.update({ money: findplayer.get('money') - totalMoney });
                        await findBee.update({ beeLevel: findBee.get('beeLevel') + lastArg, beePower: findBee.get('beePower') * (0.05 * lastArg + 1) });
                    }
                    if (collector.customId === 'deny') {
                        confirmMessage.edit({ content: `You decided not to train your ${capitaliseWords(findBeeName.get('beeName'))}.`, embeds: [], components: [] });
                    }
                }
                else if (lastArg === 1 && findplayer.get('money') >= totalMoney) {
                    await interaction.reply(`Trained your ${capitaliseWords(findBeeName.get('beeName'))} for ${totalMoney} money! Your ${capitaliseWords(findBeeName.get('beeName'))}'s level increased by one!`);
                    await findplayer.update({ money: findplayer.get('money') - totalMoney });
                    await findBee.update({ beeLevel: findBee.get('beeLevel') + 1, beePower: findBee.get('beePower') * (0.05 * lastArg + 1) });
                }
                else {
                    await interaction.reply(`You don't have enough money for this! You need ${totalMoney - findplayer.get('money')} more money.`);
                }
            }
            catch (error) {
                await interaction.reply(`There was an error! ${error.name}: ${error.message}`);
                console.log(error);
            }
        },
};