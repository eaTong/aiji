import { PrismaClient } from '@prisma/client'
import { ExerciseCategory, Equipment } from '@prisma/client'

const prisma = new PrismaClient()

interface SeedExercise {
  name: string
  nameEn: string
  category: ExerciseCategory
  equipment: Equipment
  primaryMuscles: string[]
  secondaryMuscles: string[]
  instructions?: string
  commonMistakes?: string
}

const exercises: SeedExercise[] = [
  // CHEST
  {
    name: '杠铃卧推',
    nameEn: 'Barbell Bench Press',
    category: 'CHEST',
    equipment: 'GYM',
    primaryMuscles: ['胸大肌'],
    secondaryMuscles: ['肱三头肌', '三角肌前束'],
    instructions: '平躺在卧推凳上，双手握杠略宽于肩，发力将杠铃推起至手臂伸直。',
    commonMistakes: '腰部过度拱起、下降时速度过快、握距过宽或过窄。',
  },
  {
    name: '上斜杠铃卧推',
    nameEn: 'Incline Barbell Press',
    category: 'CHEST',
    equipment: 'GYM',
    primaryMuscles: ['上胸'],
    secondaryMuscles: ['肱三头肌', '三角肌前束'],
    instructions: '将凳子调至30-45度角，双手握杠推起，专注于上胸发力。',
    commonMistakes: '角度过大、下落位置过低、推举时肩部前伸。',
  },
  {
    name: '哑铃飞鸟',
    nameEn: 'Dumbbell Fly',
    category: 'CHEST',
    equipment: 'DUMBBELL',
    primaryMuscles: ['胸大肌'],
    secondaryMuscles: ['三角肌前束'],
    instructions: '平躺，双手持哑铃向两侧打开，然后夹胸将哑铃合拢。',
    commonMistakes: '重量过重导致肩部代偿、关节角度过大。',
  },
  {
    name: '双杠臂屈伸',
    nameEn: 'Dip',
    category: 'CHEST',
    equipment: 'BODYWEIGHT',
    primaryMuscles: ['下胸', '肱三头肌'],
    secondaryMuscles: ['三角肌'],
    instructions: '撑在双杠上，身体下沉后再撑起，保持身体直立或略微前倾。',
    commonMistakes: '身体过于前倾、肩部发力过多、下沉深度不够。',
  },
  // BACK
  {
    name: '引体向上',
    nameEn: 'Pull-up',
    category: 'BACK',
    equipment: 'BODYWEIGHT',
    primaryMuscles: ['背阔肌'],
    secondaryMuscles: ['二头肌', '核心'],
    instructions: '双手正握单杠，悬挂姿势开始，将身体拉起至下巴过杠。',
    commonMistakes: '借助惯性摆动、身体晃动、下落时控制不足。',
  },
  {
    name: '高位下拉',
    nameEn: 'Lat Pulldown',
    category: 'BACK',
    equipment: 'GYM',
    primaryMuscles: ['背阔肌'],
    secondaryMuscles: ['二头肌', '菱形肌'],
    instructions: '坐姿，双手宽握横杆，将杆拉至锁骨位置，然后控制还原。',
    commonMistakes: '身体过度后仰、下拉时只用臂力、还原时完全放松。',
  },
  {
    name: '杠铃划船',
    nameEn: 'Barbell Row',
    category: 'BACK',
    equipment: 'GYM',
    primaryMuscles: ['背阔肌', '菱形肌'],
    secondaryMuscles: ['二头肌', '斜方肌'],
    instructions: '屈髋俯身，双手握杠铃，将杠铃拉向小腹位置。',
    commonMistakes: '腰部拱起、只用手臂发力、动作幅度不足。',
  },
  {
    name: '坐姿划船',
    nameEn: 'Seated Row',
    category: 'BACK',
    equipment: 'GYM',
    primaryMuscles: ['菱形肌', '斜方肌中束'],
    secondaryMuscles: ['二头肌', '背阔肌'],
    instructions: '坐姿，双手握住把手，将把手拉向腹部，保持背部挺直。',
    commonMistakes: '肩胛前伸过度、躯干晃动、重量过重。',
  },
  {
    name: '哑铃划船',
    nameEn: 'Dumbbell Row',
    category: 'BACK',
    equipment: 'DUMBBELL',
    primaryMuscles: ['背阔肌'],
    secondaryMuscles: ['二头肌', '菱形肌'],
    instructions: '单手撑在凳上，另一手握哑铃，将哑铃拉向髋部。',
    commonMistakes: '躯干旋转角度过大、只用手臂发力。',
  },
  // LEGS
  {
    name: '杠铃深蹲',
    nameEn: 'Barbell Squat',
    category: 'LEGS',
    equipment: 'GYM',
    primaryMuscles: ['股四头肌', '臀大肌'],
    secondaryMuscles: ['腘绳肌', '核心'],
    instructions: '杠铃置于斜方肌上，下蹲至大腿与地面平行或更低。',
    commonMistakes: '膝盖内扣、膝盖过度前伸、腰背弯曲。',
  },
  {
    name: '腿举',
    nameEn: 'Leg Press',
    category: 'LEGS',
    equipment: 'GYM',
    primaryMuscles: ['股四头肌', '臀大肌'],
    secondaryMuscles: ['腘绳肌'],
    instructions: '躺在腿举机上，双脚踩踏板，发力将踏板推开。',
    commonMistakes: '腰部离开靠垫、膝盖内扣、下放深度过大。',
  },
  {
    name: '腿弯举',
    nameEn: 'Leg Curl',
    category: 'LEGS',
    equipment: 'GYM',
    primaryMuscles: ['腘绳肌'],
    secondaryMuscles: ['小腿肌群'],
    instructions: '俯卧在腿弯举器械上，将重量向臀部方向弯举。',
    commonMistakes: '臀部抬起、动作速度过快、只用半程。',
  },
  {
    name: '腿伸展',
    nameEn: 'Leg Extension',
    category: 'LEGS',
    equipment: 'GYM',
    primaryMuscles: ['股四头肌'],
    secondaryMuscles: [],
    instructions: '坐在腿伸展器械上，将重量向前方伸展。',
    commonMistakes: '用力过猛导致关节压力过大、脚踝姿势错误。',
  },
  {
    name: '罗马尼亚硬拉',
    nameEn: 'Romanian Deadlift',
    category: 'LEGS',
    equipment: 'GYM',
    primaryMuscles: ['腘绳肌', '臀大肌'],
    secondaryMuscles: ['下背', '核心'],
    instructions: '手持杠铃，保持膝盖微曲，向前屈髋感受腘绳肌拉伸。',
    commonMistakes: '弯腰驼背、膝盖过度弯曲、站姿过宽。',
  },
  {
    name: '保加利亚深蹲',
    nameEn: 'Bulgarian Split Squat',
    category: 'LEGS',
    equipment: 'DUMBBELL',
    primaryMuscles: ['股四头肌', '臀大肌'],
    secondaryMuscles: ['腘绳肌', '核心'],
    instructions: '后脚置于凳上，前脚下蹲至大腿与地面平行。',
    commonMistakes: '前膝过度前伸、躯干前倾过大、平衡不稳。',
  },
  // SHOULDERS
  {
    name: '肩推举',
    nameEn: 'Shoulder Press',
    category: 'SHOULDERS',
    equipment: 'GYM',
    primaryMuscles: ['三角肌前束', '三角肌中束'],
    secondaryMuscles: ['肱三头肌', '斜方肌'],
    instructions: '坐姿或站姿，双手握杠或哑铃，将重量推过头顶。',
    commonMistakes: '腰部过度反弓、下放时肩部前伸、借力过大多。',
  },
  {
    name: '侧平举',
    nameEn: 'Lateral Raise',
    category: 'SHOULDERS',
    equipment: 'DUMBBELL',
    primaryMuscles: ['三角肌中束'],
    secondaryMuscles: ['三角肌前束', '斜方肌'],
    instructions: '双手持哑铃，向两侧平举至肩膀高度。',
    commonMistakes: '重量过重导致耸肩、举至过高位置、摆动借力。',
  },
  {
    name: '面拉',
    nameEn: 'Face Pull',
    category: 'SHOULDERS',
    equipment: 'GYM',
    primaryMuscles: ['三角肌后束', '小圆肌'],
    secondaryMuscles: ['斜方肌', '菱形肌'],
    instructions: '使用绳索器械，将绳索拉向面部，保持肘部抬高。',
    commonMistakes: '重量过大、只用手臂发力、外旋角度不足。',
  },
  // ARMS
  {
    name: '杠铃弯举',
    nameEn: 'Barbell Curl',
    category: 'ARMS',
    equipment: 'GYM',
    primaryMuscles: ['肱二头肌'],
    secondaryMuscles: ['肱肌', '前臂肌群'],
    instructions: '双手握杠铃，将杠铃弯举至肩部位置。',
    commonMistakes: '借助身体摆动、只做半程、肘部前移。',
  },
  {
    name: '哑铃弯举',
    nameEn: 'Dumbbell Curl',
    category: 'ARMS',
    equipment: 'DUMBBELL',
    primaryMuscles: ['肱二头肌'],
    secondaryMuscles: ['肱肌', '前臂肌群'],
    instructions: '双手各持哑铃，交替或同时弯举至肩部。',
    commonMistakes: '身体晃动借力、动作速度过快。',
  },
  {
    name: '锤式弯举',
    nameEn: 'Hammer Curl',
    category: 'ARMS',
    equipment: 'DUMBBELL',
    primaryMuscles: ['肱肌'],
    secondaryMuscles: ['肱二头肌', '前臂肌群'],
    instructions: '双手握哑铃保持中立位，弯举时小指朝上。',
    commonMistakes: '肩部前伸借力、动作幅度不足。',
  },
  {
    name: '绳索下压',
    nameEn: 'Cable Pushdown',
    category: 'ARMS',
    equipment: 'GYM',
    primaryMuscles: ['肱三头肌'],
    secondaryMuscles: [],
    instructions: '站姿，双手握绳索把手，向下压至手臂伸直。',
    commonMistakes: '身体前倾过大、肘部外张、下压深度过大。',
  },
  {
    name: '过头臂屈伸',
    nameEn: 'Overhead Tricep Extension',
    category: 'ARMS',
    equipment: 'DUMBBELL',
    primaryMuscles: ['肱三头肌'],
    secondaryMuscles: [],
    instructions: '双手托住哑铃过头，向后弯曲手臂，然后伸直。',
    commonMistakes: '肘部外张过度、动作速度过快、核心不稳。',
  },
  // CORE
  {
    name: '平板支撑',
    nameEn: 'Plank',
    category: 'CORE',
    equipment: 'BODYWEIGHT',
    primaryMuscles: ['腹横肌', '腹直肌'],
    secondaryMuscles: ['竖脊肌', '肩部'],
    instructions: '肘撑地面，保持身体呈直线，核心收紧。',
    commonMistakes: '臀部塌腰或翘起、头部前伸、时间过长导致姿势崩溃。',
  },
  {
    name: '卷腹',
    nameEn: 'Crunch',
    category: 'CORE',
    equipment: 'BODYWEIGHT',
    primaryMuscles: ['腹直肌'],
    secondaryMuscles: ['腹斜肌'],
    instructions: '仰卧屈膝，双手抱头或置于耳侧，将上背部卷离地面。',
    commonMistakes: '用力过猛导致颈椎压力过大、只做颈部发力。',
  },
  {
    name: '悬垂举腿',
    nameEn: 'Hanging Leg Raise',
    category: 'CORE',
    equipment: 'BODYWEIGHT',
    primaryMuscles: ['腹直肌下段', '髂腰肌'],
    secondaryMuscles: ['腹斜肌', '股四头肌'],
    instructions: '悬挂于单杠，保持腿部伸直或微屈，将腿举至与地面平行或更高。',
    commonMistakes: '借助惯性摆动、身体晃动、动作幅度不足。',
  },
  // CARDIO
  {
    name: '跑步机快走',
    nameEn: 'Treadmill Walk',
    category: 'CARDIO',
    equipment: 'GYM',
    primaryMuscles: ['股四头肌', '小腿肌群'],
    secondaryMuscles: ['腘绳肌', '臀大肌'],
    instructions: '在跑步机上保持较快速度行走，心率维持在有氧区间。',
    commonMistakes: '扶手握得太紧、步幅过大或过小。',
  },
  {
    name: '划船机',
    nameEn: 'Rowing Machine',
    category: 'CARDIO',
    equipment: 'GYM',
    primaryMuscles: ['背阔肌', '股四头肌'],
    secondaryMuscles: ['腘绳肌', '核心', '二头肌'],
    instructions: '坐姿划船，保持正确发力顺序：腿推-背拉-还原。',
    commonMistakes: '过度使用背部、手臂发力过早、节奏混乱。',
  },
  {
    name: '动感单车',
    nameEn: 'Stationary Bike',
    category: 'CARDIO',
    equipment: 'GYM',
    primaryMuscles: ['股四头肌', '小腿肌群'],
    secondaryMuscles: ['腘绳肌', '臀大肌'],
    instructions: '调整坐垫和把手高度，保持适当阻力骑行。',
    commonMistakes: '阻力过大导致踏频过慢、骑行姿势不正确。',
  },
  {
    name: '跳绳',
    nameEn: 'Jump Rope',
    category: 'CARDIO',
    equipment: 'BODYWEIGHT',
    primaryMuscles: ['小腿肌群'],
    secondaryMuscles: ['肩部', '核心', '前臂肌群'],
    instructions: '手腕驱动绳子，保持脚尖轻跳，节奏稳定。',
    commonMistakes: '绳子过长或过短、跳得太高、节奏不均匀。',
  },
  {
    name: '波比跳',
    nameEn: 'Burpee',
    category: 'CARDIO',
    equipment: 'BODYWEIGHT',
    primaryMuscles: ['全身'],
    secondaryMuscles: ['股四头肌', '胸大肌', '核心'],
    instructions: '从站立开始，下蹲后跳至俯卧撑姿势，再跳起回到站立。',
    commonMistakes: '俯卧撑姿势不标准、跳跃高度不足、节奏过快导致无法完成。',
  },
]

export async function seedExercises(): Promise<void> {
  // Check if exercises already exist
  const existingCount = await prisma.exercise.count({
    where: { isCustom: false, userId: null },
  })

  if (existingCount > 0) {
    console.log(`Exercise seed: ${existingCount} exercises already exist, skipping.`)
    return
  }

  await prisma.exercise.createMany({
    data: exercises.map((ex) => ({
      name: ex.name,
      nameEn: ex.nameEn,
      category: ex.category,
      equipment: ex.equipment,
      primaryMuscles: ex.primaryMuscles,
      secondaryMuscles: ex.secondaryMuscles,
      instructions: ex.instructions,
      commonMistakes: ex.commonMistakes,
      isCustom: false,
      isFavorite: false,
      userId: null,
    })),
  })

  console.log(`Seeded ${exercises.length} exercises.`)
}