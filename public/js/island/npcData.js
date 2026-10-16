// What each NPC asks. An NPC's ten words are their ROLE CARDS (roleCards.js,
// shared with the Collection). Every word has a sentence from that NPC's day:
//
//   zh    - the sentence, ＿＿ marks the gap
//   py/en - pinyin and English of the whole sentence
//   wrong - two words of the same NPC that clearly do NOT fit the gap
//
// ISLAND_NPC_DATA is built from the two files: for each NPC,
//   { album, label, words: [ { w, p, m, s } ] }
// A word with no sentence here is still asked (with the plain question types).
//
// PLACEHOLDER Chinese: please have a Chinese speaker check the sentences.
const ISLAND_SENTENCES = {
  // Teacher
  "教室": { zh: "同学们都坐在＿＿里听老师讲故事。", py: "Tóngxuémen dōu zuò zài jiàoshì lǐ tīng lǎoshī jiǎng gùshi.", en: "The pupils all sit in the classroom to hear the teacher's story.", wrong: ["作业","书包"] },
  "作业": { zh: "回家以后，我要先做＿＿再玩。", py: "Huí jiā yǐhòu, wǒ yào xiān zuò zuòyè zài wán.", en: "After getting home I do my homework before playing.", wrong: ["教室","书包"] },
  "书包": { zh: "他的＿＿里有课本和铅笔。", py: "Tā de shūbāo lǐ yǒu kèběn hé qiānbǐ.", en: "His school bag has textbooks and pencils in it.", wrong: ["作业","考试"] },
  "同学": { zh: "下课后，我和＿＿一起玩。", py: "Xiàkè hòu, wǒ hé tóngxué yìqǐ wán.", en: "After class I play with my classmates.", wrong: ["作业","书包"] },
  "考试": { zh: "明天有数学＿＿，我今晚要复习。", py: "Míngtiān yǒu shùxué kǎoshì, wǒ jīnwǎn yào fùxí.", en: "There is a maths exam tomorrow, so I must revise tonight.", wrong: ["黑板","铅笔"] },
  "课本": { zh: "请把＿＿翻到第十页。", py: "Qǐng bǎ kèběn fān dào dì shí yè.", en: "Please turn your textbook to page ten.", wrong: ["考试","教室"] },
  "铅笔": { zh: "我用＿＿写字，写错了可以擦掉。", py: "Wǒ yòng qiānbǐ xiě zì, xiě cuò le kěyǐ cā diào.", en: "I write with a pencil, so I can rub out mistakes.", wrong: ["黑板","作业"] },
  "黑板": { zh: "老师在＿＿上写了今天的题目。", py: "Lǎoshī zài hēibǎn shàng xiě le jīntiān de tímù.", en: "The teacher wrote today's topic on the blackboard.", wrong: ["同学","考试"] },
  // Club Volunteer
  "志愿者": { zh: "我是社区中心的＿＿，每个星期六都来帮忙。", py: "Wǒ shì shèqū zhōngxīn de zhìyuànzhě, měi gè xīngqīliù dōu lái bāngmáng.", en: "I am a volunteer at the community centre and help out every Saturday.", wrong: ["报名","课程"] },
  "报名": { zh: "想参加书法班的人，请到前台＿＿。", py: "Xiǎng cānjiā shūfǎ bān de rén, qǐng dào qiántái bàomíng.", en: "If you want to join the calligraphy class, please sign up at the front desk.", wrong: ["欢迎","志愿者"] },
  "课程": { zh: "这个＿＿教老人怎么用手机。", py: "Zhège kèchéng jiāo lǎorén zěnme yòng shǒujī.", en: "This course teaches the elderly how to use a phone.", wrong: ["报名","欢迎"] },
  "欢迎": { zh: "阿姨笑着说：“＿＿来到我们的俱乐部！”", py: "Āyí xiàozhe shuō: “Huānyíng lái dào wǒmen de jùlèbù!”", en: "The auntie smiled and said, “Welcome to our club!”", wrong: ["课程","志愿者"] },
  "书法": { zh: "每个星期六，爷爷都去会馆练习＿＿。", py: "Měi gè xīngqīliù, yéye dōu qù huìguǎn liànxí shūfǎ.", en: "Every Saturday Grandpa goes to the club to practise calligraphy.", wrong: ["志愿者","欢迎"] },
  "免费": { zh: "这个讲座是＿＿的，不用付钱。", py: "Zhège jiǎngzuò shì miǎnfèi de, bú yòng fùqián.", en: "This talk is free; you do not need to pay.", wrong: ["帮忙","书法"] },
  "帮忙": { zh: "邻居搬家，我们去＿＿搬箱子。", py: "Línjū bānjiā, wǒmen qù bāngmáng bān xiāngzi.", en: "The neighbour is moving house, so we go to help carry boxes.", wrong: ["免费","会员"] },
  "会员": { zh: "他是俱乐部的＿＿，可以参加所有活动。", py: "Tā shì jùlèbù de huìyuán, kěyǐ cānjiā suǒyǒu huódòng.", en: "He is a member of the club and can join all the activities.", wrong: ["课程","帮忙"] },
  // Police Officer
  "警察": { zh: "迷路的人可以向＿＿求助。", py: "Mílù de rén kěyǐ xiàng jǐngchá qiúzhù.", en: "People who are lost can ask the police for help.", wrong: ["安全","巡逻"] },
  "安全": { zh: "晚上回家要小心，注意＿＿。", py: "Wǎnshang huí jiā yào xiǎoxīn, zhùyì ānquán.", en: "Be careful going home at night and mind your safety.", wrong: ["警察","报警"] },
  "巡逻": { zh: "警察每天晚上在社区里＿＿。", py: "Jǐngchá měitiān wǎnshang zài shèqū lǐ xúnluó.", en: "The police patrol the neighbourhood every night.", wrong: ["安全","报警"] },
  "报警": { zh: "看到可疑的人，要马上＿＿。", py: "Kàndào kěyí de rén, yào mǎshàng bàojǐng.", en: "If you see a suspicious person, call the police at once.", wrong: ["巡逻","安全"] },
  "迷路": { zh: "小朋友在商场里＿＿了，哭了起来。", py: "Xiǎopéngyou zài shāngchǎng lǐ mílù le, kū le qǐlái.", en: "The little child got lost in the mall and began to cry.", wrong: ["钱包","小偷"] },
  "小偷": { zh: "警察抓到了偷东西的＿＿。", py: "Jǐngchá zhuādào le tōu dōngxi de xiǎotōu.", en: "The police caught the thief who stole things.", wrong: ["迷路","提醒"] },
  "钱包": { zh: "我的＿＿不见了，里面有身份证。", py: "Wǒ de qiánbāo bú jiàn le, lǐmiàn yǒu shēnfènzhèng.", en: "My wallet is missing and my ID card is inside.", wrong: ["小偷","提醒"] },
  "提醒": { zh: "警察＿＿大家锁好门窗。", py: "Jǐngchá tíxǐng dàjiā suǒ hǎo ménchuāng.", en: "The police remind everyone to lock their doors and windows.", wrong: ["钱包","迷路"] },
  // Chicken Rice Seller
  "老板": { zh: "＿＿，再给我一碗汤！", py: "Lǎobǎn, zài gěi wǒ yì wǎn tāng!", en: "Boss, another bowl of soup please!", wrong: ["米饭","酱油"] },
  "米饭": { zh: "这块鸡肉配上香喷喷的＿＿最好吃。", py: "Zhè kuài jīròu pèi shàng xiāngpēnpēn de mǐfàn zuì hǎochī.", en: "This chicken is best with fragrant rice.", wrong: ["酱油","汤"] },
  "酱油": { zh: "请在饭上淋一点＿＿。", py: "Qǐng zài fàn shàng lín yìdiǎn jiàngyóu.", en: "Please drizzle a little soy sauce on the rice.", wrong: ["汤","老板"] },
  "汤": { zh: "天气凉，我想喝一碗热＿＿。", py: "Tiānqì liáng, wǒ xiǎng hē yì wǎn rè tāng.", en: "It is cool, so I would like a bowl of hot soup.", wrong: ["米饭","酱油"] },
  "盘子": { zh: "请把鸡饭放在白色的＿＿里。", py: "Qǐng bǎ jīfàn fàng zài báisè de pánzi lǐ.", en: "Please put the chicken rice on the white plate.", wrong: ["酱油","黄瓜"] },
  "黄瓜": { zh: "鸡饭旁边有几片绿色的＿＿。", py: "Jīfàn pángbiān yǒu jǐ piàn lǜsè de huángguā.", en: "Next to the chicken rice are a few slices of green cucumber.", wrong: ["盘子","汤"] },
  "勺子": { zh: "喝汤的时候要用＿＿。", py: "Hē tāng de shíhou yào yòng sháozi.", en: "You need a spoon when drinking soup.", wrong: ["黄瓜","老板"] },
  "厨师": { zh: "这位＿＿煮的鸡饭很香。", py: "Zhè wèi chúshī zhǔ de jīfàn hěn xiāng.", en: "The chicken rice this chef cooked smells great.", wrong: ["勺子","米饭"] },
  // Drinks Seller
  "奶茶": { zh: "我每天下午都要喝一杯＿＿。", py: "Wǒ měitiān xiàwǔ dōu yào hē yì bēi nǎichá.", en: "I have a cup of milk tea every afternoon.", wrong: ["杯子","吸管"] },
  "咖啡": { zh: "爸爸早上要喝＿＿才有精神。", py: "Bàba zǎoshang yào hē kāfēi cái yǒu jīngshén.", en: "Dad needs coffee in the morning to feel awake.", wrong: ["杯子","吸管"] },
  "冰": { zh: "请加多一点＿＿，我要冰凉的。", py: "Qǐng jiā duō yìdiǎn bīng, wǒ yào bīngliáng de.", en: "Please add more ice; I want it icy cold.", wrong: ["杯子","吸管"] },
  "杯子": { zh: "请给我一个干净的＿＿。", py: "Qǐng gěi wǒ yí gè gānjìng de bēizi.", en: "Please give me a clean cup.", wrong: ["糖","冰"] },
  "糖": { zh: "我的咖啡不要加＿＿，谢谢。", py: "Wǒ de kāfēi bú yào jiā táng, xièxie.", en: "No sugar in my coffee, please.", wrong: ["杯子","吸管"] },
  "热": { zh: "天气冷，我想喝一杯＿＿茶。", py: "Tiānqì lěng, wǒ xiǎng hē yì bēi rè chá.", en: "It is cold, so I would like a cup of hot tea.", wrong: ["吸管","杯子"] },
  "吸管": { zh: "请给我一根＿＿，我要喝椰子水。", py: "Qǐng gěi wǒ yì gēn xīguǎn, wǒ yào hē yēzi shuǐ.", en: "Please give me a straw; I want to drink coconut water.", wrong: ["牛奶","杯子"] },
  "牛奶": { zh: "小孩子每天早上都喝一杯＿＿。", py: "Xiǎoháizi měitiān zǎoshang dōu hē yì bēi niúnǎi.", en: "Children drink a glass of milk every morning.", wrong: ["吸管","热"] },
  // Fruit Seller
  "西瓜": { zh: "夏天吃冰凉的＿＿最解渴。", py: "Xiàtiān chī bīngliáng de xīguā zuì jiěkě.", en: "Cold watermelon is the best thirst-quencher in summer.", wrong: ["袋子","便宜"] },
  "芒果": { zh: "我买了一个黄黄的＿＿。", py: "Wǒ mǎi le yí gè huánghuáng de mángguǒ.", en: "I bought a yellow mango.", wrong: ["甜","便宜"] },
  "新鲜": { zh: "这些水果很＿＿，是今天早上刚到的。", py: "Zhèxiē shuǐguǒ hěn xīnxiān, shì jīntiān zǎoshang gāng dào de.", en: "This fruit is very fresh; it only arrived this morning.", wrong: ["西瓜","袋子"] },
  "便宜": { zh: "三个才两块钱，真＿＿！", py: "Sān gè cái liǎng kuài qián, zhēn piányi!", en: "Three for only two dollars; so cheap!", wrong: ["西瓜","袋子"] },
  "苹果": { zh: "我每天吃一个红红的＿＿。", py: "Wǒ měitiān chī yí gè hónghóng de píngguǒ.", en: "I eat a red apple every day.", wrong: ["袋子","甜"] },
  "香蕉": { zh: "猴子最爱吃黄色的＿＿。", py: "Hóuzi zuì ài chī huángsè de xiāngjiāo.", en: "Monkeys love eating yellow bananas best.", wrong: ["袋子","便宜"] },
  "甜": { zh: "这个芒果很＿＿，像糖一样。", py: "Zhège mángguǒ hěn tián, xiàng táng yíyàng.", en: "This mango is very sweet, like sugar.", wrong: ["袋子","苹果"] },
  "袋子": { zh: "请给我一个＿＿装水果。", py: "Qǐng gěi wǒ yí gè dàizi zhuāng shuǐguǒ.", en: "Please give me a bag to put the fruit in.", wrong: ["香蕉","新鲜"] },
  // Station Master
  "闸门": { zh: "请把卡放在＿＿的感应器上。", py: "Qǐng bǎ kǎ fàng zài zhámén de gǎnyìngqì shàng.", en: "Please place your card on the sensor of the gate.", wrong: ["车票","列车"] },
  "车票": { zh: "我没有卡，所以买了一张＿＿。", py: "Wǒ méiyǒu kǎ, suǒyǐ mǎi le yì zhāng chēpiào.", en: "I have no card, so I bought a ticket.", wrong: ["延误","列车"] },
  "列车": { zh: "＿＿马上就要进站了。", py: "Lièchē mǎshàng jiùyào jìn zhàn le.", en: "The train is about to arrive at the station.", wrong: ["车票","延误"] },
  "延误": { zh: "信号故障，列车会＿＿十分钟。", py: "Xìnhào gùzhàng, lièchē huì yánwù shí fēnzhōng.", en: "There is a signal fault; the train will be delayed ten minutes.", wrong: ["车票","闸门"] },
  "广播": { zh: "请听＿＿，列车会晚点五分钟。", py: "Qǐng tīng guǎngbō, lièchē huì wǎndiǎn wǔ fēnzhōng.", en: "Please listen to the announcement; the train will be five minutes late.", wrong: ["地图","闸门"] },
  "方向": { zh: "你坐错了＿＿，要到对面的月台。", py: "Nǐ zuò cuò le fāngxiàng, yào dào duìmiàn de yuètái.", en: "You took the wrong direction; go to the platform opposite.", wrong: ["广播","延误"] },
  "紧急": { zh: "遇到＿＿情况，请按红色的按钮。", py: "Yùdào jǐnjí qíngkuàng, qǐng àn hóngsè de ànniǔ.", en: "In an emergency, please press the red button.", wrong: ["车票","地图"] },
  "地图": { zh: "我看不懂路线，请给我一张＿＿。", py: "Wǒ kàn bu dǒng lùxiàn, qǐng gěi wǒ yì zhāng dìtú.", en: "I cannot understand the route; please give me a map.", wrong: ["闸门","方向"] },
  // Bus Captain
  "扶手": { zh: "车开得快，请抓紧＿＿。", py: "Chē kāi de kuài, qǐng zhuājǐn fúshǒu.", en: "The bus is moving fast; please hold the handrail.", wrong: ["铃","终点站"] },
  "铃": { zh: "要下车的人请按＿＿。", py: "Yào xiàchē de rén qǐng àn líng.", en: "If you want to get off, please press the bell.", wrong: ["扶手","塞车"] },
  "终点站": { zh: "这辆车的＿＿是裕廊东。", py: "Zhè liàng chē de zhōngdiǎnzhàn shì Yùláng Dōng.", en: "The last stop of this bus is Jurong East.", wrong: ["铃","扶手"] },
  "塞车": { zh: "下雨天常常＿＿，巴士来得很慢。", py: "Xiàyǔ tiān chángcháng sāichē, bāshì lái de hěn màn.", en: "It often jams when it rains, so the bus comes slowly.", wrong: ["铃","终点站"] },
  "方向盘": { zh: "司机双手握着＿＿，认真开车。", py: "Sījī shuāngshǒu wòzhe fāngxiàngpán, rènzhēn kāichē.", en: "The driver holds the steering wheel with both hands and drives carefully.", wrong: ["车厢","终点站"] },
  "让座": { zh: "看到老人上车，要主动＿＿。", py: "Kàndào lǎorén shàngchē, yào zhǔdòng ràngzuò.", en: "When you see an elderly person board, you should offer your seat.", wrong: ["车厢","扶手"] },
  "刹车": { zh: "前面有人过马路，司机马上＿＿。", py: "Qiánmiàn yǒu rén guò mǎlù, sījī mǎshàng shāchē.", en: "Someone was crossing the road ahead, so the driver braked at once.", wrong: ["车厢","扶手"] },
  "车厢": { zh: "这趟车的＿＿里很拥挤。", py: "Zhè tàng chē de chēxiāng lǐ hěn yōngjǐ.", en: "It is very crowded inside this carriage.", wrong: ["刹车","让座"] },
  // Taxi Driver
  "机场": { zh: "请载我去樟宜＿＿。", py: "Qǐng zài wǒ qù Zhāngyí jīchǎng.", en: "Please take me to Changi Airport.", wrong: ["地址","红灯"] },
  "地址": { zh: "请告诉我您的＿＿。", py: "Qǐng gàosu wǒ nín de dìzhǐ.", en: "Please tell me your address.", wrong: ["行李","红灯"] },
  "红灯": { zh: "前面是＿＿，我们要停一下。", py: "Qiánmiàn shì hóngdēng, wǒmen yào tíng yíxià.", en: "There is a red light ahead, so we have to stop.", wrong: ["地址","行李"] },
  "行李": { zh: "后备箱可以放你的＿＿。", py: "Hòubèixiāng kěyǐ fàng nǐ de xíngli.", en: "Your luggage can go in the boot.", wrong: ["机场","红灯"] },
  "安全带": { zh: "上车后请系好＿＿。", py: "Shàngchē hòu qǐng jì hǎo ānquándài.", en: "Please fasten your seat belt after getting in.", wrong: ["地址","行李"] },
  "导航": { zh: "司机打开＿＿，跟着地图走。", py: "Sījī dǎkāi dǎoháng, gēnzhe dìtú zǒu.", en: "The driver turns on the navigation and follows the map.", wrong: ["行李","找钱"] },
  "找钱": { zh: "我给司机一百块，他要＿＿给我。", py: "Wǒ gěi sījī yì bǎi kuài, tā yào zhǎoqián gěi wǒ.", en: "I gave the driver a hundred dollars and he has to give me change.", wrong: ["转弯","红灯"] },
  "转弯": { zh: "前面的路口请向右＿＿。", py: "Qiánmiàn de lùkǒu qǐng xiàng yòu zhuǎnwān.", en: "Please turn right at the junction ahead.", wrong: ["安全带","行李"] },
  "作文": { zh: "老师要我们写一篇关于家人的＿＿。", py: "Lǎoshī yào wǒmen xiě yì piān guānyú jiārén de zuòwén.", en: "The teacher wants us to write a composition about family.", wrong: ["铅笔", "黑板"] },
  "下课": { zh: "铃声一响，就是＿＿时间了。", py: "Língshēng yì xiǎng, jiù shì xiàkè shíjiān le.", en: "When the bell rings, it is time for class to end.", wrong: ["课本", "铅笔"] },
  "舞蹈": { zh: "社区中心每个星期三有＿＿班。", py: "Shèqū zhōngxīn měi gè xīngqīsān yǒu wǔdǎo bān.", en: "The community centre has a dance class every Wednesday.", wrong: ["帮忙", "欢迎"] },
  "通知": { zh: "请看墙上的＿＿，上面写着活动时间。", py: "Qǐng kàn qiáng shàng de tōngzhī, shàngmiàn xiězhe huódòng shíjiān.", en: "Please look at the notice on the wall; it shows the activity times.", wrong: ["会员", "帮忙"] },
  "号码": { zh: "请记下车牌＿＿，再告诉警察。", py: "Qǐng jì xià chēpái hàomǎ, zài gàosu jǐngchá.", en: "Please note down the car plate number and tell the police.", wrong: ["钱包", "迷路"] },
  "证件": { zh: "出示您的＿＿，我要检查一下。", py: "Chūshì nín de zhèngjiàn, wǒ yào jiǎnchá yíxià.", en: "Show me your ID; I need to check it.", wrong: ["小偷", "迷路"] },
  "鸡腿": { zh: "我要一份鸡饭，加一个＿＿。", py: "Wǒ yào yí fèn jīfàn, jiā yí gè jītuǐ.", en: "I would like a chicken rice with an extra drumstick.", wrong: ["汤", "厨师"] },
  "辣酱": { zh: "不能吃辣的人，不要加＿＿。", py: "Bù néng chī là de rén, bú yào jiā làjiàng.", en: "People who cannot eat spicy food should not add chilli sauce.", wrong: ["盘子", "勺子"] },
  "柠檬": { zh: "夏天喝冰＿＿茶特别解渴。", py: "Xiàtiān hē bīng níngméng chá tèbié jiěkě.", en: "Iced lemon tea is especially refreshing in summer.", wrong: ["杯子", "吸管"] },
  "豆浆": { zh: "爷爷早餐喜欢喝一杯热＿＿。", py: "Yéye zǎocān xǐhuan hē yì bēi rè dòujiāng.", en: "Grandpa likes a cup of hot soy milk for breakfast.", wrong: ["吸管", "杯子"] },
  "橙子": { zh: "妈妈剥了一个＿＿给我吃。", py: "Māma bō le yí gè chéngzi gěi wǒ chī.", en: "Mum peeled an orange for me to eat.", wrong: ["袋子", "甜"] },
  "榴莲": { zh: "＿＿的味道很特别，有人爱有人怕。", py: "Liúlián de wèidào hěn tèbié, yǒu rén ài yǒu rén pà.", en: "Durian has a special smell; some love it and some fear it.", wrong: ["袋子", "便宜"] },
  "储值": { zh: "我的卡没钱了，要去＿＿。", py: "Wǒ de kǎ méi qián le, yào qù chǔzhí.", en: "My card has no money left, so I need to top it up.", wrong: ["广播", "方向"] },
  "失物": { zh: "我把雨伞忘在车上了，请问＿＿招领处在哪里？", py: "Wǒ bǎ yǔsǎn wàng zài chē shàng le, qǐngwèn shīwù zhāolǐng chù zài nǎlǐ?", en: "I left my umbrella on the train; where is the lost property office?", wrong: ["闸门", "车票"] },
  "到站": { zh: "请注意，车子快要＿＿了。", py: "Qǐng zhùyì, chēzi kuài yào dàozhàn le.", en: "Attention please; the bus is about to arrive at the stop.", wrong: ["扶手", "车厢"] },
  "坐稳": { zh: "车子开动了，请＿＿，抓好扶手。", py: "Chēzi kāidòng le, qǐng zuòwěn, zhuā hǎo fúshǒu.", en: "The bus is moving; please sit steady and hold the handrail.", wrong: ["车厢", "终点站"] },
  "空车": { zh: "路边有一辆＿＿，我们快招手吧。", py: "Lù biān yǒu yí liàng kōngchē, wǒmen kuài zhāoshǒu ba.", en: "There is a free taxi by the road; let us wave quickly.", wrong: ["安全带", "导航"] },
  "后座": { zh: "小孩要坐在＿＿，并且系好安全带。", py: "Xiǎohái yào zuò zài hòuzuò, bìngqiě jì hǎo ānquándài.", en: "Children must sit in the back seat and fasten the seat belt.", wrong: ["导航", "找钱"] },
};

const ISLAND_NPC_DATA = {};
(function buildNpcData() {
  const language = "zh";
  const rc = typeof ROLE_CARDS !== "undefined" ? ROLE_CARDS[language] || {} : {};
  Object.entries(rc).forEach(([album, groups]) => {
    groups.forEach((g) => {
      ISLAND_NPC_DATA[g.id] = {
        album, label: g.label,
        words: g.words.map((x) => ({ w: x.word, p: x.romanization, m: x.meaning, s: ISLAND_SENTENCES[x.word] || null })),
      };
    });
  });
})();