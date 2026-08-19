import type {
  AdultEvent,
  AdultEventChoice,
  AdultMark,
  Approach,
  Chapter,
  CostOption,
  GrowthChoice,
  GrowthEvent,
  LifeCard,
  Origin,
  WorldClimate,
} from './types';

const TRAIT_BY_APPROACH = {
  洞察: 'insight',
  行动: 'nerve',
  共情: 'empathy',
} as const;

const COSTS: Record<Approach, CostOption[]> = {
  洞察: [
    { resource: 'heart', amount: 1, text: '你把一个下午耗在反复琢磨里。' },
    { resource: 'pressure', amount: -1, text: '想明白以后，压在胸口的东西松了一点。' },
    { resource: 'bonds', amount: 1, text: '你没有及时回应某个人。' },
  ],
  行动: [
    { resource: 'heart', amount: 1, text: '你用一身疲惫换来了结果。' },
    { resource: 'money', amount: 1, text: '这次尝试花掉了一点家里的余量。' },
    { resource: 'pressure', amount: 1, text: '你记住了出手时心跳的速度。' },
  ],
  共情: [
    { resource: 'bonds', amount: -1, text: '有人记住了你当时伸出的手。' },
    { resource: 'heart', amount: 1, text: '接住别人的情绪，也会累。' },
    { resource: 'money', amount: 1, text: '你悄悄填上了一个小小的缺口。' },
  ],
};

function reward(
  title: string,
  memory: string,
  approach: Approach,
  index: number,
  tags: string[],
): Omit<LifeCard, 'id' | 'originAge'> {
  const effects = {
    洞察: [
      { kind: 'draw' as const, description: '胜出时，多看一张牌。' },
      { kind: 'steady' as const, description: '压力不低于 4 时，牌力 +2。' },
    ],
    行动: [
      { kind: 'resource' as const, resource: 'heart' as const, amount: 1, description: '胜出时，心气 +1。' },
      { kind: 'echo' as const, description: '若上一轮失手，牌力 +2。' },
    ],
    共情: [
      { kind: 'resource' as const, resource: 'bonds' as const, amount: 1, description: '胜出时，人情 +1。' },
      { kind: 'resource' as const, resource: 'pressure' as const, amount: -1, description: '出牌后，压力 -1。' },
    ],
  };
  return {
    title,
    memory,
    approach,
    power: 3 + ((index + title.length) % 3),
    guard: 1 + ((index + memory.length) % 2),
    effect: effects[approach][index % 2],
    tags,
  };
}

function choice(
  id: string,
  verb: string,
  detail: string,
  approach: Approach,
  first: [string, string],
  second: [string, string],
  tags: string[],
): GrowthChoice {
  return {
    id,
    verb,
    detail,
    approach,
    trait: TRAIT_BY_APPROACH[approach],
    cards: [reward(first[0], first[1], approach, 0, tags), reward(second[0], second[1], approach, 1, tags)],
    costs: COSTS[approach],
  };
}

export const GROWTH_EVENTS: GrowthEvent[] = [
  {
    age: 4, stage: '幼儿园', title: '蓝色蜡笔',
    text: '午睡前，你最喜欢的蓝色蜡笔不见了。老师说，谁拿错了就放回盒子。没有人动。',
    question: '你第一次意识到，答案不总会自己出现。',
    choices: [
      choice('4a', '检查每张桌子', '从蜡笔屑和蓝色指印开始找。', '洞察', ['细小证据', '你学会让痕迹替人说话。'], ['不在场证明', '你先排除了不可能的人。'], ['观察', '学校']),
      choice('4b', '站起来问', '让每个人都把口袋翻出来。', '行动', ['第一次发问', '声音在安静的教室里没有缩回去。'], ['直截了当', '你发现开口本身就是一种力量。'], ['勇气', '学校']),
      choice('4c', '把另一支送出去', '你猜拿走它的人也许只是太想要。', '共情', ['留一支给你', '第二天，两支蓝蜡笔一起回来了。'], ['没有追问', '你给一个错误留了回头的门。'], ['善意', '学校']),
    ],
  },
  {
    age: 5, stage: '幼儿园', title: '窗外的雨',
    text: '暴雨让家长们晚到了。最后只剩你和另一个总不说话的孩子，走廊的灯一盏盏关掉。',
    question: '等待很长，你决定怎么度过。',
    choices: [
      choice('5a', '数雨落下的间隔', '把害怕变成一个可以计算的问题。', '洞察', ['雨声刻度', '无序里也能找到节拍。'], ['等待法', '你发明了不被时间吞掉的方法。'], ['耐心', '独处']),
      choice('5b', '去门口看一眼', '哪怕保安说不要乱跑。', '行动', ['越过黄线', '你确认世界并没有在门外消失。'], ['自己去看', '传闻不如亲眼。'], ['勇气', '远方']),
      choice('5c', '讲一个乱编的故事', '让旁边的人先忘记害怕。', '共情', ['两个人的城堡', '一段胡说八道撑过了漫长夜色。'], ['替别人等', '照顾另一个人时，你也不再孤单。'], ['陪伴', '故事']),
    ],
  },
  {
    age: 6, stage: '幼儿园', title: '空出来的主角',
    text: '汇演前一天，演主角的孩子发烧了。老师环顾一圈，没人敢接那一长串台词。',
    question: '幕布已经拉开了一条缝。',
    choices: [
      choice('6a', '先拆出台词规律', '把长句分成几个能记住的动作。', '洞察', ['分段记忆', '大困难被你切成了小格子。'], ['幕后结构', '你看见了表演下面的骨架。'], ['方法', '舞台']),
      choice('6b', '举手', '你其实只记得第一句。', '行动', ['临时主角', '腿在抖，台词却一句句跟了上来。'], ['灯亮时向前', '机会没有等到你准备好。'], ['舞台', '勇气']),
      choice('6c', '陪候补一起练', '你说可以两个人轮流演。', '共情', ['共享台词', '掌声落在两个人身上。'], ['给怯场的人半边舞台', '合作不是退让。'], ['合作', '舞台']),
    ],
  },
  {
    age: 7, stage: '小学', title: '六十八分',
    text: '第一张真正要签字的试卷：六十八。回家的路比平时短，你还没想好怎样递出去。',
    question: '门锁响了。',
    choices: [
      choice('7a', '先订正完再拿出', '让错误排成一张地图。', '洞察', ['错题地图', '失败第一次变得可以使用。'], ['红笔以外', '分数背后还有原因。'], ['学习', '方法']),
      choice('7b', '进门就递过去', '先承担，再解释。', '行动', ['不藏的试卷', '最难的十秒很快过去了。'], ['先说坏消息', '坦白让你拿回了主动。'], ['诚实', '家庭']),
      choice('7c', '问父母小时候考过几分', '把审判变成一次交谈。', '共情', ['大人的六十八分', '原来父母也不是生来就会。'], ['餐桌谈判', '你学会让两代人坐在问题同一边。'], ['家庭', '沟通']),
    ],
  },
  {
    age: 8, stage: '小学', title: '同桌的秘密',
    text: '同桌告诉你他要转学，要求你绝对保密。老师却在班会上问：最近谁知道他为什么心不在焉？',
    question: '三十双眼睛没有看你，但你觉得秘密很重。',
    choices: [
      choice('8a', '区分秘密和求救', '先判断沉默会不会让事情更坏。', '洞察', ['保密边界', '承诺不是停止思考。'], ['必要的例外', '规则也有保护不了人的时候。'], ['判断', '友谊']),
      choice('8b', '下课后找老师', '不在众人面前，但也不装作没看见。', '行动', ['走廊报告', '你选择承担朋友可能的误解。'], ['艰难告知', '有些勇敢听起来像背叛。'], ['责任', '友谊']),
      choice('8c', '只说他需要一点时间', '守住秘密，也替他挡住追问。', '共情', ['半句真话', '你替一个人保存了体面。'], ['安静的盾', '没有解释，也是一种陪伴。'], ['体面', '友谊']),
    ],
  },
  {
    age: 9, stage: '小学', title: '旧货摊上的机器',
    text: '旧货市场有台坏掉的收音机，价钱正好是你攒了半年的零花钱。摊主说，不保证能响。',
    question: '你摸到旋钮上的灰。',
    choices: [
      choice('9a', '拆开后盖检查', '先看它为什么沉默。', '洞察', ['后盖里的城市', '线路像一张陌生地图。'], ['故障假说', '先猜，再验证。'], ['技术', '好奇']),
      choice('9b', '砍价后买下', '风险也可以有一个更合适的价格。', '行动', ['第一次成交', '你用胆量省下了两枚硬币。'], ['买下未知', '有些门票不保证演出。'], ['交易', '冒险']),
      choice('9c', '请摊主讲它的来历', '也许故事比机器本身值钱。', '共情', ['旧电台往事', '陌生人说起了年轻时的远方。'], ['物件记得', '你听见价格之外的价值。'], ['故事', '倾听']),
    ],
  },
  {
    age: 10, stage: '小学', title: '三道杠',
    text: '班里选干部。最会管人的同学拉票说，选他就不记大家的名字。朋友推你上去。',
    question: '权力第一次看起来像一件很小的东西。',
    choices: [
      choice('10a', '写下班级真正的问题', '不谈谁更受欢迎。', '洞察', ['问题清单', '治理先从准确命名开始。'], ['规则草案', '好制度不依赖好脾气。'], ['组织', '规则']),
      choice('10b', '上台竞选', '承诺不包庇任何人，包括朋友。', '行动', ['公开承诺', '说出口的话开始约束你。'], ['举手表决', '你愿意让结果被所有人看见。'], ['领导', '责任']),
      choice('10c', '说服两边一起值日', '把竞争改造成分工。', '共情', ['共同值日表', '敌对的人也能共享一张表格。'], ['没有输家', '你找到了第三种安排。'], ['协调', '组织']),
    ],
  },
  {
    age: 11, stage: '小学', title: '最后一排的新同学',
    text: '新同学口音很重，回答问题时有人模仿他。老师没有听见，笑声越来越大。',
    question: '你也差点笑出来。',
    choices: [
      choice('11a', '指出笑声的规律', '让大家发现自己只是在跟着别人笑。', '洞察', ['群体回声', '人多不等于每个人都同意。'], ['笑声来源', '你追到了恶意最初的那一点。'], ['群体', '判断']),
      choice('11b', '当场制止', '哪怕下一秒全班会看你。', '行动', ['不笑的人', '沉默的多数终于有了一个声音。'], ['逆着起哄', '你第一次站到人群对面。'], ['正义', '勇气']),
      choice('11c', '下课请他教你一句方言', '让不同成为可以交换的东西。', '共情', ['方言交换', '被取笑的声音成了一门小课。'], ['最后一排的朋友', '你走到了教室最远的地方。'], ['包容', '友谊']),
    ],
  },
  {
    age: 12, stage: '小学', title: '缺一个人的毕业照',
    text: '拍毕业照那天，常被遗忘的同学去医务室了。摄影师催着所有人站好，下一班已经在等。',
    question: '快门只需要一秒。',
    choices: [
      choice('12a', '算清重拍的时间', '向摄影师提出一个不耽误下一班的安排。', '洞察', ['一分钟方案', '精确让善意更有说服力。'], ['排队缝隙', '你在拥挤日程里找到空位。'], ['计划', '告别']),
      choice('12b', '挡在镜头前', '少一个人就不拍。', '行动', ['没有按下的快门', '暂停也可以是一种决定。'], ['全班等一人', '你让效率为一个人让路。'], ['担当', '告别']),
      choice('12c', '带大家去医务室合照', '背景不好看，但人齐。', '共情', ['医务室毕业照', '最不像纪念照的一张，后来被保存最久。'], ['人齐才算', '形式退后了一步。'], ['纪念', '友谊']),
    ],
  },
  {
    age: 13, stage: '初中', title: '排名表',
    text: '年级排名被贴在走廊。你的名字在中间，朋友在最后。所有人假装只是路过。',
    question: '一张纸把人排成了纵队。',
    choices: [
      choice('13a', '比较自己的变化', '拒绝只看横向的名次。', '洞察', ['纵向坐标', '你发明了另一个衡量自己的轴。'], ['排名之外', '指标没有错，只是不完整。'], ['学习', '判断']),
      choice('13b', '撕下偷拍的照片', '有人正准备发到群里取笑最后几名。', '行动', ['群聊撤回', '你在扩散前按住了它。'], ['走廊对峙', '你没有让围观变成默认。'], ['边界', '勇气']),
      choice('13c', '陪朋友走另一条楼梯', '今天不必经过那张纸。', '共情', ['绕路十分钟', '最短的路不总是最好的路。'], ['并肩下楼', '你没有说“别在意”。'], ['陪伴', '友谊']),
    ],
  },
  {
    age: 14, stage: '初中', title: '匿名论坛',
    text: '校园论坛出现一篇攻击老师的帖子，观点有些道理，但夹着编造的私生活。回帖越来越激烈。',
    question: '匿名让每句话都像从墙里冒出来。',
    choices: [
      choice('14a', '逐条核对', '把事实、推测和辱骂分开。', '洞察', ['事实分栏', '混在一起的话被你重新拆开。'], ['来源追问', '“大家都说”不再是证据。'], ['媒介', '判断']),
      choice('14b', '实名写下反驳', '承认合理批评，拒绝捏造。', '行动', ['实名回帖', '名字让文字重新有了重量。'], ['逆流发言', '你没有等风向先改变。'], ['表达', '责任']),
      choice('14c', '私下询问当事老师', '先让被讨论的人有说话机会。', '共情', ['当事人的版本', '故事第一次有了另一面。'], ['敲门之前', '你愿意面对一个可能尴尬的人。'], ['倾听', '媒介']),
    ],
  },
  {
    age: 15, stage: '初中', title: '停掉的加班车',
    text: '家里一个大人失业了。饭桌上所有人都说没事，第二天起，水果和周末出游一起消失。',
    question: '你听懂了那些没有说出口的账。',
    choices: [
      choice('15a', '做一份家用预算', '把恐慌换成几个可以讨论的数字。', '洞察', ['家庭账本', '数字没有安慰人，却让路变清楚。'], ['必要与想要', '你学会给欲望排序。'], ['金钱', '家庭']),
      choice('15b', '找一份周末小工', '不等大人同意，先去问。', '行动', ['第一份工钱', '很少，但它是你挣来的。'], ['周末班次', '日历上第一次出现了责任。'], ['工作', '金钱']),
      choice('15c', '照常讲学校的笑话', '不让餐桌只剩下坏消息。', '共情', ['饭桌上的笑声', '轻松不是假装无事发生。'], ['维持日常', '有人在动荡里守住普通的一天。'], ['家庭', '韧性']),
    ],
  },
  {
    age: 16, stage: '高中', title: '分岔口',
    text: '分科意向表只剩一晚。老师说你适合稳妥的方向，你却总在另一类课上忘记下课。',
    question: '“适合”与“想要”隔着一张薄纸。',
    choices: [
      choice('16a', '列出三年后的代价', '不只计算下一次考试。', '洞察', ['长期账', '你开始和未来的自己共同决策。'], ['机会成本', '选择也包括放弃什么。'], ['未来', '判断']),
      choice('16b', '选让自己忘记下课的', '接受它未必最稳。', '行动', ['逆向选择', '你第一次把热爱写进正式表格。'], ['签下偏爱', '倾向变成了需要负责的决定。'], ['未来', '勇气']),
      choice('16c', '找三个过来人聊聊', '借用别人的未来看一眼。', '共情', ['三种人生样本', '建议彼此矛盾，却都是真的。'], ['借来的远见', '你从别人的遗憾里辨认自己。'], ['倾听', '未来']),
    ],
  },
  {
    age: 17, stage: '高中', title: '志愿表最后一格',
    text: '远方的学校机会更多，也更贵；本地的选择普通，却能常回家。截止时间还剩十一分钟。',
    question: '成年以前，最后一张由别人催你填写的表。',
    choices: [
      choice('17a', '重算最坏情况', '确认即使失败，也有路回来。', '洞察', ['下行路线', '勇敢之前，你先替失败留门。'], ['十一分钟模型', '重要决定也可以被拆解。'], ['远方', '计划']),
      choice('17b', '填上远方', '按下确认，不再刷新页面。', '行动', ['离站车票', '目的地从名词变成了日期。'], ['确认键', '你把犹豫留在倒计时之外。'], ['远方', '独立']),
      choice('17c', '把真实顾虑说给家人', '不把留下等同于孝顺，也不把离开叫作背叛。', '共情', ['成年前的谈判', '一家人第一次讨论彼此的边界。'], ['可以离开的家', '牵挂没有变成绳子。'], ['家庭', '独立']),
    ],
  },
];

export const CHAPTERS: Chapter[] = [
  {
    id: 'first-job', year: 18, title: '没有经验的人', location: '人才市场 · B17 摊位', target: 9, rounds: 4,
    premise: '招聘方把你的简历翻到背面，问：“你拿什么证明自己不是一张白纸？”',
    intents: [
      { id: 'j1', title: '资历门槛', approach: '洞察', power: 5, tell: '对方反复指向职位说明里的数字。', text: '规章试图把你挡在故事开始之前。' },
      { id: 'j2', title: '临场追问', approach: '行动', power: 6, tell: '面试官合上简历，等你先开口。', text: '现在没有标准答案。' },
      { id: 'j3', title: '团队疑虑', approach: '共情', power: 5, tell: '对方问起你如何与难相处的人共事。', text: '能力之外，他们也在判断你会留下什么气氛。' },
      { id: 'j4', title: '压价时刻', approach: '洞察', power: 7, tell: '一个模糊的“年轻人要看长远”被放到桌面上。', text: '数字被藏在漂亮话后面。' },
    ],
    victory: '你拿到一张薄薄的录用通知。它没有承诺未来，只承认了你的第一步。',
    setback: '岗位没有留下你。你把那几句追问抄在背面，去敲下一扇门。',
  },
  {
    id: 'city', year: 21, title: '陌生城市的押金', location: '合租屋 · 凌晨 00:43', target: 10, rounds: 4,
    premise: '房东临时涨价，室友准备放弃。明早之前，你们必须决定是留下、谈判，还是拖着箱子离开。',
    intents: [
      { id: 'c1', title: '模糊合同', approach: '洞察', power: 6, tell: '关键条款被一句“大家都这样”带过。', text: '纸上的空白正等着吞掉口头承诺。' },
      { id: 'c2', title: '限时逼迫', approach: '行动', power: 7, tell: '电话那头开始十分钟倒计时。', text: '仓促本身成了对方的筹码。' },
      { id: 'c3', title: '室友动摇', approach: '共情', power: 5, tell: '室友盯着打包到一半的纸箱。', text: '同盟的裂缝比房门先开了。' },
      { id: 'c4', title: '现金缺口', approach: '行动', power: 7, tell: '计算器上的数字比余额多出一截。', text: '现实要求立即行动。' },
    ],
    victory: '天亮时，新的补充条款写清了价格。屋子还是小，但门锁发出的声音像你自己的。',
    setback: '你拖着箱子走进清晨。城市没有收留你，却也没能把你赶回原点。',
  },
  {
    id: 'trust', year: 25, title: '合伙人的沉默', location: '共享办公室 · 第七码表格', target: 11, rounds: 4,
    premise: '你和朋友做了半年的项目。关键款项不见了，合伙人三天没有回复，而发布日期就在周五。',
    intents: [
      { id: 't1', title: '账目断层', approach: '洞察', power: 7, tell: '三笔支出没有对应凭证。', text: '信任需要经得起逐行查看。' },
      { id: 't2', title: '发布倒计时', approach: '行动', power: 8, tell: '客户每小时都在追问进度。', text: '窗口正在关闭。' },
      { id: 't3', title: '旧友情', approach: '共情', power: 7, tell: '聊天框停在你们第一次谈梦想的那晚。', text: '追责与理解争夺同一句开场白。' },
      { id: 't4', title: '团队恐慌', approach: '共情', power: 6, tell: '剩下的人开始互相猜测。', text: '没有答案时，情绪会抢先填空。' },
    ],
    victory: '问题被摊在桌上，项目活了下来。关系变了形，却比原先更接近真实。',
    setback: '发布日期过去了。你失去一些钱、一些信任，也得到一条此后不再省略的底线。',
  },
  {
    id: 'turning', year: 30, title: '时代突然转弯', location: '公司会议室 · 无窗', target: 12, rounds: 5,
    premise: '行业在半年内换了方向。旧经验贬值，部门裁撤名单还没公布，每个人都在假装照常工作。',
    intents: [
      { id: 'r1', title: '旧路径依赖', approach: '洞察', power: 8, tell: '所有方案都从“以前一直如此”开始。', text: '经验正在要求你向它效忠。' },
      { id: 'r2', title: '裁撤传闻', approach: '共情', power: 7, tell: '茶水间每个停顿都像内部消息。', text: '恐慌比正式通知更快。' },
      { id: 'r3', title: '学习陡坡', approach: '行动', power: 8, tell: '新工具的说明书比可用时间更长。', text: '没人会为准备不足暂停变化。' },
      { id: 'r4', title: '同伴竞争', approach: '共情', power: 8, tell: '过去互相帮忙的人开始隐藏文件。', text: '稀缺让关系变窄。' },
      { id: 'r5', title: '空白岗位', approach: '洞察', power: 9, tell: '新职位没有前任，也没有清楚的职责。', text: '机会以不确定性的样子出现。' },
    ],
    victory: '名单公布时，你已经站在另一条路上。不是因为预见了一切，而是你肯在看不清时移动。',
    setback: '工位被装进纸箱。离开时你带走的不是职位，而是一套重新开始的动作。',
  },
  {
    id: 'proposal', year: 36, title: '你要怎样生活', location: '家中餐桌 · 周日傍晚', target: 13, rounds: 5,
    premise: '一个看似更体面的机会要求你放弃现在的生活节奏。没人能替你判断，得到的是否比失去的更多。',
    intents: [
      { id: 'p1', title: '他人的标尺', approach: '洞察', power: 8, tell: '劝说里频繁出现“到了这个年纪”。', text: '一条公共刻度想接管你的私人答案。' },
      { id: 'p2', title: '安全幻觉', approach: '行动', power: 9, tell: '留下似乎不需要做任何决定。', text: '不选择也在消耗未来。' },
      { id: 'p3', title: '牵挂重量', approach: '共情', power: 9, tell: '每个选项都会让某个人失望。', text: '爱没有给出同一个方向。' },
      { id: 'p4', title: '沉没成本', approach: '洞察', power: 10, tell: '你开始列举已经付出的那些年。', text: '过去要求未来继续证明它正确。' },
      { id: 'p5', title: '亲手确认', approach: '行动', power: 10, tell: '表格最后只剩下你的签名。', text: '世界退到门外，等你落笔。' },
    ],
    victory: '你签下的不是最正确的人生，只是你愿意负责的那一种。窗外天色暗了，屋里灯刚刚亮。',
    setback: '你没有立刻得到答案。但这一次，你不再把迟疑伪装成命运。',
  },
];

export const WORLD_CLIMATES: WorldClimate[] = [
  { id: 'ordinary', title: '平常年份', description: '没有顺风，也没有额外的坏消息。' },
  { id: 'window', title: '机会窗口', description: '变化很快，先动起来的人多一点空间。行动牌牌力 +1。', approachBoost: '行动' },
  { id: 'fog', title: '信息迷雾', description: '消息互相矛盾，能辨别事实的人占先。洞察牌牌力 +1。', approachBoost: '洞察' },
  { id: 'network', title: '熟人社会', description: '很多门没有写在地图上。共情牌牌力 +1。', approachBoost: '共情' },
  { id: 'tightening', title: '现金紧缩', description: '每个人都更谨慎，所有世界牌强度 +1。', worldPower: 1 },
  { id: 'breathing', title: '短暂缓冲', description: '局面暂时没有继续恶化，所有世界牌强度 −1。', worldPower: -1 },
];

const MARKS: Record<string, AdultMark> = {
  savings: { id: 'savings', title: '留有余粮', description: '每场牌局第一轮牌力 +1。', tone: 'good', effect: { kind: 'first-round', amount: 1 } },
  debt: { id: 'debt', title: '人情债', description: '世界牌强度 +1，直到有事件替你卸下它。', tone: 'bad', effect: { kind: 'world', amount: 1 } },
  nightSchool: { id: 'night-school', title: '夜校同学', description: '洞察牌牌力 +1。', tone: 'good', effect: { kind: 'approach', approach: '洞察', amount: 1 } },
  mutualAid: { id: 'mutual-aid', title: '互助名单', description: '共情牌牌力 +1。', tone: 'good', effect: { kind: 'approach', approach: '共情', amount: 1 } },
  portableHome: { id: 'portable-home', title: '可搬走的家', description: '换手不再增加压力。', tone: 'good', effect: { kind: 'redraw', amount: -1 } },
  bodyWarning: { id: 'body-warning', title: '身体警告', description: '章节间少恢复 1 点心气。', tone: 'bad', effect: { kind: 'recovery', amount: -1 } },
  sidePath: { id: 'side-path', title: '第二条路', description: '行动牌牌力 +1。', tone: 'good', effect: { kind: 'approach', approach: '行动', amount: 1 } },
  boundary: { id: 'boundary', title: '清楚的边界', description: '每次三式组合额外推进 1。', tone: 'good', effect: { kind: 'combo', amount: 1 } },
  burnout: { id: 'burnout', title: '没有关掉的工作', description: '世界牌强度 +1。', tone: 'bad', effect: { kind: 'world', amount: 1 } },
  sabbatical: { id: 'sabbatical', title: '主动停顿', description: '章节间额外恢复 1 点心气。', tone: 'good', effect: { kind: 'recovery', amount: 1 } },
  founder: { id: 'founder', title: '共同签名', description: '行动牌牌力 +1。', tone: 'mixed', effect: { kind: 'approach', approach: '行动', amount: 1 } },
  hometownKey: { id: 'hometown-key', title: '随身的家门钥匙', description: '共情牌牌力 +1。', tone: 'good', effect: { kind: 'approach', approach: '共情', amount: 1 } },
  mentor: { id: 'mentor', title: '后来人的问题', description: '三式组合额外推进 1。', tone: 'good', effect: { kind: 'combo', amount: 1 } },
  studentAgain: { id: 'student-again', title: '重新做学生', description: '洞察牌牌力 +1。', tone: 'good', effect: { kind: 'approach', approach: '洞察', amount: 1 } },
  caregiver: { id: 'caregiver', title: '照护者', description: '共情牌牌力 +1。', tone: 'mixed', effect: { kind: 'approach', approach: '共情', amount: 1 } },
};

function adultChoice(
  id: string,
  verb: string,
  detail: string,
  changes: AdultEventChoice['changes'],
  outcomes: string[],
  extras: Partial<Pick<AdultEventChoice, 'trait' | 'requirement' | 'mark' | 'removeMark' | 'upgradeCard'>> = {},
): AdultEventChoice {
  return { id, verb, detail, changes, outcomes, ...extras };
}

export const ADULT_EVENTS: AdultEvent[] = [
  {
    id: 'first-salary', afterChapter: 0, age: 19, category: '钱与自由', title: '第一笔完整工资',
    text: '工资到账的短信比你想象中短。家里刚好要换一件电器，朋友约你去看一直想看的演出，你的银行卡第一次像一张小小的选票。',
    question: '这笔钱先投给哪一种生活？',
    choices: [
      adultChoice('save', '先留三个月余量', '把兴奋压进一张自动转存单。', { money: 2, pressure: -1 }, ['余额没有变成故事，却让后来的坏消息没那么响。'], { mark: MARKS.savings, trait: 'insight' }),
      adultChoice('home', '给家里换掉旧电器', '没有人开口要求，但你知道它已经坏很久。', { money: -2, bonds: 2 }, ['送货师傅离开后，家里那种勉强凑合的声音少了一种。'], { trait: 'empathy' }),
      adultChoice('live', '买下那张演出票', '成年不该只有需要。', { money: -1, heart: 2, pressure: -1 }, ['散场时末班车已经走了。你一路走回去，第一次觉得花掉的钱也能留下东西。'], { trait: 'nerve' }),
    ],
  },
  {
    id: 'friend-loan', afterChapter: 0, age: 20, category: '朋友与钱', title: '朋友开口借钱',
    text: '老朋友说只是周转两周，金额不大不小，刚好会让你接下来一个月过得紧。你听见电话那边还有别人的声音。',
    question: '信任要不要写进账本？',
    choices: [
      adultChoice('lend', '不问用途，直接转账', '你选择相信这段关系的过去。', { money: -2, bonds: 2 }, ['钱晚了很久才回来，朋友发来的那句谢谢却一直留在聊天框。'], { mark: MARKS.debt, trait: 'empathy' }),
      adultChoice('contract', '问清楚并写下日期', '体面与边界可以同时存在。', { bonds: -1, pressure: -1 }, ['对方沉默了一会儿，然后把真正的麻烦说了出来。'], { mark: MARKS.boundary, trait: 'insight' }),
      adultChoice('refuse', '说现在帮不了', '不编造余额不足的借口。', { bonds: -2, heart: 1 }, ['通话很快结束。你难受了一晚，但没有把拒绝伪装成事故。'], { trait: 'nerve' }),
    ],
  },
  {
    id: 'night-class', afterChapter: 0, age: 20, category: '学习与时间', title: '周二晚上的教室',
    text: '一门与你工作无关的夜校课程开放报名。学费不便宜，每周还会吃掉两个晚上。报名页面在零点关闭。',
    question: '已经开始工作的人，还能把时间交给无用的好奇吗？',
    choices: [
      adultChoice('enrol', '报名', '暂时不问它能换来什么职位。', { money: -2, heart: -1 }, ['教室里坐着快递员、会计、退休老师和你。世界突然又大了一点。'], { mark: MARKS.nightSchool, trait: 'insight', upgradeCard: true }),
      adultChoice('audit', '先去旁听一次', '用一晚测试自己的热情。', { heart: -1, pressure: -1 }, ['你没有立刻承诺一年，只认真过完了这个周二。'], { trait: 'insight' }),
      adultChoice('overtime', '关掉页面去加班', '眼前的工作更确定。', { money: 2, pressure: 2 }, ['办公室的灯亮到很晚。你得到加班费，也记住了那扇没推开的门。'], { trait: 'nerve' }),
    ],
  },
  {
    id: 'lease-renewal', afterChapter: 1, age: 23, category: '居所', title: '又一次搬家通知',
    text: '房子要卖，三十天后必须搬走。你和附近的早餐摊刚熟，书架也才钉稳。纸箱从床底被重新拖了出来。',
    question: '家是地址，还是可以一起搬走的东西？',
    choices: [
      adultChoice('closer', '咬牙租近一点', '用钱换回每天两小时。', { money: -3, heart: 2, pressure: -1 }, ['新房更小，但你第一次在天黑前到家。'], { requirement: { resource: 'money', min: 3, text: '需要至少 3 点余钱' }, mark: MARKS.portableHome, trait: 'insight' }),
      adultChoice('share', '找人重新合租', '把不确定分给几个陌生人。', { money: 1, bonds: 1, pressure: 1 }, ['客厅多了四双鞋，也多了几个临时能接住快递的人。'], { mark: MARKS.mutualAid, trait: 'empathy' }),
      adultChoice('farther', '搬去更远的地方', '用通勤保存账户余额。', { money: 2, heart: -2, pressure: 1 }, ['每天的城市被拉长了。你开始在地铁上睡得很熟。'], { trait: 'nerve' }),
    ],
  },
  {
    id: 'checkup', afterChapter: 1, age: 24, category: '身体', title: '体检单上的箭头',
    text: '几个指标旁边多了向上的箭头。医生说现在不严重，但“以后要注意”通常意味着从今天开始。',
    question: '你会怎样理解这张尚未构成坏消息的纸？',
    choices: [
      adultChoice('change', '真的改掉一种习惯', '先从连续睡够七小时开始。', { heart: 2, pressure: -2, money: -1 }, ['最初几周什么也没发生。后来你才发现，没有恶化本身就是结果。'], { removeMark: 'burnout', trait: 'insight' }),
      adultChoice('ignore', '先收进抽屉', '工作正忙，身体可以以后再管。', { money: 1, heart: -2 }, ['那张纸安静地躺着，却开始出现在每次疲惫的念头里。'], { mark: MARKS.bodyWarning, trait: 'nerve' }),
      adultChoice('company', '约朋友一起运动', '让自律变成一段关系。', { bonds: 2, heart: 1, money: -1 }, ['你们跑得很慢，聊天比里程多。好在下周还愿意见面。'], { mark: MARKS.mutualAid, trait: 'empathy' }),
    ],
  },
  {
    id: 'outside-offer', afterChapter: 1, age: 24, category: '工作', title: '一封没有投过的邀请',
    text: '陌生公司给出更高薪水，但岗位含糊、团队年轻，要求你三天内决定。现在的工作不好不坏，熟悉得让人不用思考。',
    question: '稳定是资产，还是正在收租的惯性？',
    choices: [
      adultChoice('jump', '接受邀请', '先把脚放到另一块石头上。', { money: 2, pressure: 2, heart: -1 }, ['新工牌拿到手时，你仍不知道这是不是对的；但生活重新开始要求你醒着。'], { mark: MARKS.sidePath, trait: 'nerve' }),
      adultChoice('research', '找到三个前员工', '把陌生公司从招聘文案还原成人。', { bonds: 1, pressure: -1 }, ['三个版本互相矛盾，你却因此看清了自己真正担心什么。'], { trait: 'insight', upgradeCard: true }),
      adultChoice('stay', '留下，但谈一次条件', '不把留下等于什么都不做。', { money: 1, bonds: -1, heart: 1 }, ['你没有拿到全部要求，却让熟悉的工作第一次重新被标价。'], { mark: MARKS.boundary, trait: 'empathy' }),
    ],
  },
  {
    id: 'parent-call', afterChapter: 2, age: 27, category: '家庭', title: '电话里说“没什么”',
    text: '家人说只是一次小检查，不用回来。你听见他们刻意把医院广播压在话筒外面。手头的项目周一交付。',
    question: '成年以后，牵挂总与别的责任同时发生。',
    choices: [
      adultChoice('return', '买最近一班票回去', '先到场，再讨论是否必要。', { money: -2, bonds: 2, heart: -1 }, ['检查确实不严重。你在候诊椅上睡了一晚，没有后悔回来。'], { mark: MARKS.hometownKey, trait: 'empathy' }),
      adultChoice('arrange', '远程安排好检查', '联系亲友、挂号并整理病历。', { bonds: 1, pressure: 1, money: -1 }, ['你没有出现在走廊，却让每个环节都有人接手。'], { trait: 'insight' }),
      adultChoice('believe', '相信那句“不用回来”', '按时完成眼前的项目。', { money: 1, bonds: -2, pressure: 1 }, ['项目准时交了。几天后再通电话，你们都没有提那天。'], { trait: 'nerve' }),
    ],
  },
  {
    id: 'relationship-crossroad', afterChapter: 2, age: 28, category: '亲密关系', title: '两张不同城市的车票',
    text: '一个重要的人得到远方机会，希望你一起走。你的工作和朋友都在这里。没有谁做错，只是两条路开始分开。',
    question: '关系不是选择题，却到了必须作答的时候。',
    choices: [
      adultChoice('go', '一起去', '允许一段关系改变你的地图。', { bonds: 2, money: -2, pressure: 1 }, ['新城市的第一晚，你们坐在没拆完的箱子上吃外卖。至少此刻，这是共同作出的决定。'], { mark: MARKS.mutualAid, trait: 'empathy' }),
      adultChoice('distance', '约定一年远距离', '不给现在的答案冒充永远。', { bonds: -1, pressure: 2, heart: -1 }, ['日历开始同时记录见面和错过。你们学会了把含糊说得更清楚。'], { mark: MARKS.boundary, trait: 'insight' }),
      adultChoice('part', '承认路已经不同', '不要求某个人牺牲后再假装没发生。', { bonds: -3, heart: -2, pressure: -1 }, ['告别没有让过去失效。只是很长一段时间，你绕开了那座车站。'], { mark: MARKS.portableHome, trait: 'nerve' }),
    ],
  },
  {
    id: 'empty-week', afterChapter: 2, age: 29, category: '停顿', title: '突然空出来的一周',
    text: '项目延期，你意外得到七天空白。待办清单立刻想把它填满，但身体先在周六睡到了下午。',
    question: '空白也需要被使用吗？',
    choices: [
      adultChoice('rest', '什么都不安排', '把休息当作正事。', { heart: 3, pressure: -3 }, ['第三天你才停止为休息感到内疚。第七天，时间重新有了边缘。'], { mark: MARKS.sabbatical, removeMark: 'body-warning' }),
      adultChoice('project', '做一直搁置的小项目', '只为自己设一个截止日期。', { heart: -1, pressure: 1 }, ['它没有赚到钱，却证明你在工作身份之外仍能发起一件事。'], { mark: MARKS.sidePath, trait: 'nerve', upgradeCard: true }),
      adultChoice('visit', '去见很久没见的人', '不等下一次顺路。', { money: -1, bonds: 3, pressure: -1 }, ['你们谈了很多无用的旧事。回程时，你觉得这些无用足够支撑一阵子。'], { trait: 'empathy' }),
    ],
  },
  {
    id: 'team-cut', afterChapter: 3, age: 32, category: '责任', title: '名单上有你的下属',
    text: '公司要求团队缩减一个人，名单必须由你提交。每个人都有留下的理由，预算表却只认一个数字。',
    question: '当你成为曾经害怕的“上面”，会怎样使用这点权力？',
    choices: [
      adultChoice('fight', '拿自己的位置去谈', '要求重新审查整个预算。', { bonds: 2, pressure: 2, heart: -1 }, ['你没能保住所有人，但名单被推迟了一周，也第一次有人看见那些数字后面的名字。'], { mark: MARKS.mutualAid, trait: 'nerve' }),
      adultChoice('criteria', '公开裁撤标准', '不承诺没有伤害，只承诺规则可被质疑。', { bonds: -1, pressure: -1 }, ['会议很难看。离开的人没有感谢你，但团队知道决定从哪里来。'], { mark: MARKS.boundary, trait: 'insight' }),
      adultChoice('quiet', '按要求私下通知', '把震动控制在最小范围。', { money: 2, bonds: -3, pressure: 2 }, ['表格按时交了。之后很久，团队群里都只剩下必要的话。'], { mark: MARKS.burnout }),
    ],
  },
  {
    id: 'friend-startup', afterChapter: 3, age: 34, category: '风险', title: '老朋友的创业桌',
    text: '朋友拿出一份还不完整的计划，邀请你成为合伙人。它可能失败，也可能是你等了很久却不敢命名的第二条路。',
    question: '你愿意把多少确定性换成共同签名？',
    choices: [
      adultChoice('join', '辞职加入', '把退路也放到桌上。', { money: -3, pressure: 3, bonds: 2 }, ['你们在一张摇晃的桌子上签下名字。那一刻没有音乐，只有打印机卡纸。'], { requirement: { resource: 'money', min: 3, text: '需要至少 3 点余钱承受空窗' }, mark: MARKS.founder, trait: 'nerve' }),
      adultChoice('parttime', '只用周末参与', '给理想一个受控的试验期。', { heart: -2, pressure: 2, bonds: 1 }, ['周末从日历上消失了，但你逐渐看清这件事值不值得更多。'], { mark: MARKS.sidePath, trait: 'insight', upgradeCard: true }),
      adultChoice('decline-help', '不加入，但帮他拆计划', '友谊不一定要变成股权。', { bonds: 2, pressure: -1 }, ['你指出了三个漏洞。朋友有点失望，几周后又带着新版回来。'], { trait: 'empathy' }),
    ],
  },
  {
    id: 'hometown-flat', afterChapter: 3, age: 35, category: '故乡', title: '老房子的处置',
    text: '家里讨论卖掉住了很多年的旧房。维修昂贵，地段也不会突然升值，可每个抽屉都像在保存某个人的证词。',
    question: '记忆需要一处固定地址吗？',
    choices: [
      adultChoice('sell', '卖掉并整理旧物', '不让房子替所有人继续承担过去。', { money: 3, bonds: -1, pressure: -1 }, ['钥匙交出去前，你拍下每个房间。后来真正反复看的只有一张餐桌。'], { trait: 'insight' }),
      adultChoice('keep', '承担一部分维修', '给家留一个仍能回去的坐标。', { money: -3, bonds: 3 }, ['漏水修好了，墙仍然旧。你知道自己买下的不是升值。'], { requirement: { resource: 'money', min: 3, text: '需要至少 3 点余钱' }, mark: MARKS.hometownKey, trait: 'empathy' }),
      adultChoice('archive', '只保留几箱重要东西', '让家缩小到可以搬动。', { money: 1, bonds: 1, heart: -1 }, ['最后留下的东西比想象中少。那只旧物又一次跟你上路。'], { mark: MARKS.portableHome, trait: 'nerve' }),
    ],
  },
  {
    id: 'mentor-young', afterChapter: 4, age: 39, category: '传递', title: '年轻同事问你怎么办',
    text: '一个刚入行的人拿着几乎和你当年一样的问题来找你。他期待一个答案，而你最清楚答案会过期。',
    question: '经验应该作为结论交出去，还是作为工具？',
    choices: [
      adultChoice('story', '讲一次自己的失败', '不把幸存后的解释包装成预言。', { bonds: 2, heart: 1 }, ['对方没有得到捷径，却在你的故事里认出失败之后仍有下一页。'], { mark: MARKS.mentor, trait: 'empathy' }),
      adultChoice('method', '陪他拆解问题', '让方法比建议多活几年。', { pressure: -1, bonds: 1 }, ['你们写满一块白板。最后的选择仍由他自己作出。'], { mark: MARKS.mentor, trait: 'insight', upgradeCard: true }),
      adultChoice('answer', '直接告诉他该选什么', '有时犹豫确实需要一个推力。', { bonds: -1, pressure: 1 }, ['他照做了。结果不错，你却开始担心这份信任会不会太重。'], { trait: 'nerve' }),
    ],
  },
  {
    id: 'study-again', afterChapter: 4, age: 41, category: '重新开始', title: '比同学大很多的课堂',
    text: '你想学的新东西要求从基础开始。试听课里，大多数同学比你年轻十几岁；他们问的问题，你甚至没听懂。',
    question: '已经会了很多以后，还愿意重新显得笨拙吗？',
    choices: [
      adultChoice('student', '正式报名', '把资历暂时留在教室外。', { money: -2, heart: -1, pressure: 1 }, ['第一次作业只有七十分。你盯着分数笑了很久，像又回到那张需要签字的试卷。'], { mark: MARKS.studentAgain, trait: 'insight', upgradeCard: true }),
      adultChoice('self', '自己制定学习计划', '不追求证书，只保留节奏。', { pressure: -1, heart: 1 }, ['进度慢得无法发朋友圈，但六个月后，你确实能读懂那些术语了。'], { trait: 'insight' }),
      adultChoice('teach', '交换自己擅长的东西', '用经验换取新手指导。', { bonds: 2, money: 1 }, ['你在同一张桌上同时做老师和学生。年龄第一次不再只是差距。'], { mark: MARKS.mutualAid, trait: 'empathy' }),
    ],
  },
  {
    id: 'care-years', afterChapter: 4, age: 44, category: '照护', title: '生活被切成很多小格',
    text: '家中有人需要长期照护。预约、药盒、工作会议和自己的睡眠挤在同一张日历上，没有任何一项愿意消失。',
    question: '怎样承担一件不能靠一次勇敢解决的事？',
    choices: [
      adultChoice('alone', '自己先全部接下', '你担心别人做得不够好。', { heart: -3, pressure: 3, bonds: 1 }, ['事情被你安排得很好，直到某天你在走廊里忘了自己为什么出门。'], { mark: MARKS.caregiver, trait: 'nerve' }),
      adultChoice('network', '建立轮班和求助表', '把“麻烦别人”改成具体分工。', { money: -1, bonds: 3, pressure: -1 }, ['表格并不温暖，却让每个人知道何时该出现，也让你能睡一个完整的晚上。'], { mark: MARKS.mutualAid, trait: 'insight' }),
      adultChoice('professional', '购买专业照护', '承认爱不等于什么都亲手做。', { money: -3, heart: 2, pressure: -2 }, ['陌生人接手了一部分日常。你终于能在探望时只做家人。'], { requirement: { resource: 'money', min: 3, text: '需要至少 3 点余钱' }, removeMark: 'body-warning', trait: 'empathy' }),
    ],
  },
];

const PLACES = ['一座总在修路的省会', '一座靠工厂换班声计时的小城', '沿海城市很普通的一条旧街', '县城汽车站步行二十分钟的社区'];
const HOUSEHOLDS = ['双职工家庭', '靠一间小店维持的家庭', '三代同住的工薪家庭', '工作不太稳定但彼此照应的家庭'];
const TEXTURES = ['钱要计划着花，但书和学费从没缺过', '大人不擅长说爱，冰箱上总贴着给你的便条', '争吵来得快，第二天早餐仍会放在桌上', '家里没有特别的门路，遇事只能多问几个人'];
const KEEPSAKES = ['一只掉漆的铁皮文具盒', '一本写到一半的通讯录', '一张折了四次的公交线路图', '一台偶尔接触不良的旧收音机'];

export function originOptions(): { places: string[]; households: string[]; textures: string[]; keepsakes: string[] } {
  return { places: PLACES, households: HOUSEHOLDS, textures: TEXTURES, keepsakes: KEEPSAKES };
}

export function makeOrigin(serial: string, place: string, household: string, texture: string, keepsake: string): Origin {
  return {
    serial,
    place,
    household,
    texture,
    keepsake,
    sentence: `你出生在${place}，一个${household}。${texture}。没有预言说你会成为谁。`,
  };
}

export function makeOriginCard(origin: Origin): LifeCard {
  return {
    id: 'origin-card', title: '普通人的底牌', approach: '共情', power: 4, guard: 2, originAge: '出身',
    memory: `${origin.household}教会你：没有天赋加成，也可以把日子一张张攒起来。`,
    effect: { kind: 'resource', resource: 'heart', amount: 1, description: '胜出时，心气 +1。' },
    tags: ['普通人', '家庭'],
  };
}
