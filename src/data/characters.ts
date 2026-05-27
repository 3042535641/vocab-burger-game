import type {
  BossFinaleBeat,
  BossFinaleFrameKey,
  CharacterProfile,
  Mood,
  PortraitFrameKey,
} from '../types/game'

const makeFrames = (avatar: string): Record<PortraitFrameKey, string> => ({
  normal: `art/vn-stage/${avatar}/normal.webp`,
  waiting: `art/vn-stage/${avatar}/waiting.webp`,
  worried: `art/vn-stage/${avatar}/worried.webp`,
  angry: `art/vn-stage/${avatar}/angry.webp`,
  satisfied: `art/vn-stage/${avatar}/satisfied.webp`,
})

const lines = (
  happy: string,
  waiting: string,
  worried: string,
  angry: string,
): Record<Mood, string> => ({ happy, waiting, worried, angry })

export const characterProfiles: Record<string, CharacterProfile> = {
  boss: {
    avatar: 'boss',
    name: '医学英语教授 Boss',
    title: '终极查词教授',
    accentColor: '#ff654e',
    queuePose: 'normal',
    portraitFrames: {
      normal: 'art/vn-stage/boss/entrance.webp',
      waiting: 'art/vn-stage/boss/stern.webp',
      worried: 'art/vn-stage/boss/shocked.webp',
      angry: 'art/vn-stage/boss/breakdown.webp',
      satisfied: 'art/vn-stage/boss/defeated.webp',
    },
    linesByMood: lines('先让我抽查词根。', '教案敲桌中。', '眼镜开始脱离轨道！', '术语颜艺大崩坏！'),
    handoffLine: '我承认，这份医学英语汉堡合格。',
  },
  round: {
    avatar: 'round',
    name: '早八医学生小明',
    title: '解剖咖啡续命派',
    accentColor: '#62d9cb',
    queuePose: 'waiting',
    portraitFrames: makeFrames('round'),
    linesByMood: lines('先背结构，再吃汉堡。', '咖啡快见底了。', '早八脑区开始报警！', '我的解剖图都气皱了！'),
    handoffLine: '咖啡续上了，cell 也记住了。',
  },
  star: {
    avatar: 'star',
    name: '背词王安娜',
    title: '词根女王',
    accentColor: '#b68cff',
    queuePose: 'normal',
    portraitFrames: makeFrames('star'),
    linesByMood: lines('词根和汉堡我都要满分。', '小票准备开麦。', '别让我把 diagnosis 拼错！', '错题斩击准备！'),
    handoffLine: '好吃，terminology 进入长期记忆。',
  },
  cap: {
    avatar: 'cap',
    name: '解剖图谱小葵',
    title: '解剖图谱党',
    accentColor: '#63cfe2',
    queuePose: 'waiting',
    portraitFrames: makeFrames('cap'),
    linesByMood: lines('器官位置和配方都要精准。', '图谱翻到下一页了。', '颅骨知识快溢出了！', '骨点都被你煎红了！'),
    handoffLine: '层次分明，和解剖切面一样漂亮。',
  },
  bow: {
    avatar: 'bow',
    name: '护理技能糖糖',
    title: '护理秒表派',
    accentColor: '#8fd889',
    queuePose: 'waiting',
    portraitFrames: makeFrames('bow'),
    linesByMood: lines('按流程来，出餐也要无菌。', '秒表已经按下了。', '交班前真的来不及了！', '时间管理红温警报！'),
    handoffLine: '护理流程合格，汉堡也很治愈。',
  },
  shade: {
    avatar: 'shade',
    name: '药理课小桃',
    title: '药理红温派',
    accentColor: '#ff8c91',
    queuePose: 'normal',
    portraitFrames: makeFrames('shade'),
    linesByMood: lines('剂量精准，酱汁也精准。', '药片都等得跳了。', '副作用是我快饿晕了！', '把 dosage 答错我就爆炸！'),
    handoffLine: '起效迅速，这份汉堡通过药效评价。',
  },
  bun: {
    avatar: 'bun',
    name: '实验报告阿泽',
    title: '诊断影像派',
    accentColor: '#9ca9ff',
    queuePose: 'normal',
    portraitFrames: makeFrames('bun'),
    linesByMood: lines('先看片，再吃一口。', '检查报告还在加载。', '心电警报都亮了！', '诊断不能随便猜！'),
    handoffLine: '影像结论：这份汉堡非常可见。',
  },
}

export const customerRoster = [
  { name: characterProfiles.round.name, avatar: 'round' },
  { name: characterProfiles.star.name, avatar: 'star' },
  { name: characterProfiles.cap.name, avatar: 'cap' },
  { name: characterProfiles.bow.name, avatar: 'bow' },
  { name: characterProfiles.shade.name, avatar: 'shade' },
  { name: characterProfiles.bun.name, avatar: 'bun' },
]

export const bossFinaleFrames: Record<BossFinaleFrameKey, string> = {
  entrance: 'art/vn-stage/boss/entrance.webp',
  stern: 'art/vn-stage/boss/stern.webp',
  shocked: 'art/vn-stage/boss/shocked.webp',
  breakdown: 'art/vn-stage/boss/breakdown.webp',
  bonked: 'art/vn-stage/boss/bonked.webp',
  defeated: 'art/vn-stage/boss/defeated.webp',
}

export const bossFinaleBeats: BossFinaleBeat[] = [
  { id: 'entrance', startMs: 0, endMs: 900, frame: 'entrance', impact: 'hold' },
  { id: 'stern', startMs: 900, endMs: 1500, frame: 'stern', impact: 'hold' },
  { id: 'shocked', startMs: 1500, endMs: 3000, frame: 'shocked', impact: 'shock', callout: 'OBJECTION!' },
  { id: 'breakdown', startMs: 3000, endMs: 5500, frame: 'breakdown', impact: 'breakdown', callout: 'TERM OVERLOAD!' },
  { id: 'bonked', startMs: 5500, endMs: 7500, frame: 'bonked', impact: 'bonk', callout: 'BURGER BONK!' },
  { id: 'defeated', startMs: 7500, endMs: 10000, frame: 'defeated', impact: 'finish' },
]
