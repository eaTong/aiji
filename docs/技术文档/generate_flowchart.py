#!/usr/bin/env python3
"""
AI己 - Comprehensive User Flow Chart
Design Philosophy: Kinetic Order
Refined Version - Museum Quality
"""

from PIL import Image, ImageDraw, ImageFont
import os

# Canvas dimensions (landscape)
WIDTH = 1920
HEIGHT = 1080

# Color Palette (Kinetic Order philosophy)
CHARCOAL = (28, 28, 32)
CORAL = (255, 107, 107)
TEAL = (72, 201, 176)
AMBER = (255, 193, 120)
DEEP_BLUE = (45, 55, 75)
WHITE = (255, 255, 255)
DARK_TEXT = (40, 40, 48)
SUBTITLE_GRAY = (130, 130, 145)
NODE_BG = (42, 45, 55)
NODE_BG_LIGHT = (52, 55, 68)

# Fonts - English
FONT_DIR = "/Users/eatong/.claude/plugins/cache/anthropic-agent-skills/claude-api/b0cbd3df1533/skills/canvas-design/canvas-fonts"

# Chinese font
CHINESE_FONT_PATH = "/System/Library/Fonts/Supplemental/Songti.ttc"

def load_font(filename, size):
    path = os.path.join(FONT_DIR, filename)
    try:
        return ImageFont.truetype(path, size)
    except:
        return ImageFont.load_default()

def load_chinese_font(size):
    try:
        return ImageFont.truetype(CHINESE_FONT_PATH, size)
    except:
        return ImageFont.load_default(size)

FONT_TITLE = load_font("Jura-Medium.ttf", 44)
FONT_SUBTITLE = load_chinese_font(22)  # Chinese for subtitle
FONT_NODE_TITLE = load_font("WorkSans-Bold.ttf", 18)
FONT_NODE_DESC = load_chinese_font(15)  # Chinese
FONT_LABEL = load_font("IBMPlexMono-Regular.ttf", 13)
FONT_SMALL = load_chinese_font(12)  # Chinese
FONT_CHINESE_LARGE = load_chinese_font(20)  # For larger Chinese text
FONT_CHINESE_NODE = load_chinese_font(17)  # For node Chinese text

def draw_polygon_nofill(draw, coords, fill):
    """Draw polygon without fill outline only"""
    draw.polygon(coords, fill=fill)

def draw_flow_chart():
    img = Image.new('RGB', (WIDTH, HEIGHT), CHARCOAL)
    draw = ImageDraw.Draw(img)

    # ============ BACKGROUND GRID (subtle) ============
    grid_color = (32, 35, 42)
    for i in range(0, WIDTH, 60):
        draw.line([(i, 0), (i, HEIGHT)], fill=grid_color, width=1)
    for i in range(0, HEIGHT, 60):
        draw.line([(0, i), (WIDTH, i)], fill=grid_color, width=1)

    # ============ HEADER ============
    draw.text((80, 40), "AI己", font=FONT_TITLE, fill=WHITE)
    draw.text((80, 92), "COMPREHENSIVE USER FLOW", font=FONT_SUBTITLE, fill=SUBTITLE_GRAY)

    # Accent line
    draw.line([(80, 125), (480, 125)], fill=CORAL, width=2)

    # ============ MAIN FLOW LAYOUT ============
    # 5 lanes: Auth -> Profile -> Plan -> Training -> Recovery
    lane_y = 170
    node_h = 130
    node_w = 270
    gap = 55

    lane_total = 5 * node_w + 4 * gap
    start_x = (WIDTH - lane_total) // 2

    # Y positions for each lane
    y_auth = lane_y
    y_profile = lane_y
    y_plan = lane_y
    y_training = lane_y + 180
    y_recovery = lane_y + 30

    # ============ NODE 1: AUTHENTICATION ============
    x1 = start_x
    draw.rounded_rectangle((x1, y_auth, x1 + node_w, y_auth + node_h), 14, fill=NODE_BG)
    draw.text((x1 + 22, y_auth + 22), "01", font=FONT_LABEL, fill=CORAL)
    draw.text((x1 + 22, y_auth + 48), "AUTHENTICATION", font=FONT_NODE_TITLE, fill=WHITE)
    draw.text((x1 + 22, y_auth + 80), "微信登录", font=FONT_NODE_DESC, fill=SUBTITLE_GRAY)
    draw.text((x1 + 22, y_auth + 105), "JWT Token", font=FONT_SMALL, fill=TEAL)

    # Arrow 1->2
    ax1_end = x1 + node_w
    ax1_mid = ax1_end + gap // 2
    draw.line([(ax1_end, y_auth + node_h // 2), (ax1_mid + 8, y_auth + node_h // 2)], fill=SUBTITLE_GRAY, width=2)
    draw.polygon([(ax1_mid + 8, y_auth + node_h // 2), (ax1_mid, y_auth + node_h // 2 - 6), (ax1_mid, y_auth + node_h // 2 + 6)], fill=SUBTITLE_GRAY)

    # ============ NODE 2: PROFILE ============
    x2 = start_x + node_w + gap
    draw.rounded_rectangle((x2, y_profile, x2 + node_w, y_profile + node_h), 14, fill=NODE_BG)
    draw.text((x2 + 22, y_profile + 22), "02", font=FONT_LABEL, fill=CORAL)
    draw.text((x2 + 22, y_profile + 48), "PROFILE", font=FONT_NODE_TITLE, fill=WHITE)
    draw.text((x2 + 22, y_profile + 80), "目标 / 级别 / 器械", font=FONT_NODE_DESC, fill=SUBTITLE_GRAY)
    draw.text((x2 + 22, y_profile + 105), "每周训练日", font=FONT_SMALL, fill=TEAL)

    # Arrow 2->3
    ax2_end = x2 + node_w
    ax2_mid = ax2_end + gap // 2
    draw.line([(ax2_end, y_profile + node_h // 2), (ax2_mid + 8, y_profile + node_h // 2)], fill=SUBTITLE_GRAY, width=2)
    draw.polygon([(ax2_mid + 8, y_profile + node_h // 2), (ax2_mid, y_profile + node_h // 2 - 6), (ax2_mid, y_profile + node_h // 2 + 6)], fill=SUBTITLE_GRAY)

    # ============ NODE 3: TRAINING PLAN ============
    x3 = start_x + 2 * (node_w + gap)
    draw.rounded_rectangle((x3, y_plan, x3 + node_w, y_plan + node_h), 14, fill=NODE_BG)
    draw.text((x3 + 22, y_plan + 22), "03", font=FONT_LABEL, fill=AMBER)
    draw.text((x3 + 22, y_plan + 48), "TRAINING PLAN", font=FONT_NODE_TITLE, fill=WHITE)
    draw.text((x3 + 22, y_plan + 80), "生成训练计划", font=FONT_NODE_DESC, fill=SUBTITLE_GRAY)
    draw.text((x3 + 22, y_plan + 105), "模板: 增肌/减脂/塑形", font=FONT_SMALL, fill=AMBER)

    # Arrow 3->4 (down and right)
    ax3_end_x = x3 + node_w // 2
    ax3_start_y = y_plan + node_h
    ax3_mid_y = y_plan + node_h + 45
    ax4_center_x = x3 + node_w // 2

    draw.line([(ax3_end_x, ax3_start_y), (ax3_end_x, ax3_mid_y - 8)], fill=SUBTITLE_GRAY, width=2)
    draw.line([(ax3_end_x, ax3_mid_y), (ax4_center_x, ax3_mid_y)], fill=SUBTITLE_GRAY, width=2)
    draw.line([(ax4_center_x, ax3_mid_y), (ax4_center_x, y_training - 8)], fill=SUBTITLE_GRAY, width=2)
    draw.polygon([(ax4_center_x, y_training - 8), (ax4_center_x - 6, y_training - 16), (ax4_center_x + 6, y_training - 16)], fill=SUBTITLE_GRAY)

    # ============ NODE 4: TRAINING SESSION (expanded) ============
    training_w = 340
    training_h = 200
    x4 = start_x + 2 * (node_w + gap) - 35

    # Main container
    draw.rounded_rectangle((x4, y_training, x4 + training_w, y_training + training_h), 16, fill=NODE_BG_LIGHT)

    # Title
    draw.text((x4 + 22, y_training + 18), "04", font=FONT_LABEL, fill=CORAL)
    draw.text((x4 + 22, y_training + 42), "TRAINING SESSION", font=FONT_NODE_TITLE, fill=WHITE)

    # Step flow row 1
    step_y1 = y_training + 80
    step1_w = 95
    step_gap = 12

    # Step 1: Start
    draw.rounded_rectangle((x4 + 18, step_y1, x4 + 18 + step1_w, step_y1 + 38), 8, fill=NODE_BG)
    draw.text((x4 + 28, step_y1 + 12), "开始", font=FONT_SMALL, fill=WHITE)

    # Arrow 1
    draw.line([(x4 + 18 + step1_w, step_y1 + 19), (x4 + 18 + step1_w + step_gap, step_y1 + 19)], fill=SUBTITLE_GRAY, width=1)
    draw.polygon([(x4 + 18 + step1_w + step_gap, step_y1 + 19), (x4 + 18 + step1_w + step_gap - 6, step_y1 + 19 - 4), (x4 + 18 + step1_w + step_gap - 6, step_y1 + 19 + 4)], fill=SUBTITLE_GRAY)

    # Step 2: Add Exercise
    step2_x = x4 + 18 + step1_w + step_gap
    draw.rounded_rectangle((step2_x, step_y1, step2_x + step1_w, step_y1 + 38), 8, fill=NODE_BG)
    draw.text((step2_x + 10, step_y1 + 12), "添加动作", font=FONT_SMALL, fill=WHITE)

    # Arrow 2
    draw.line([(step2_x + step1_w, step_y1 + 19), (step2_x + step1_w + step_gap, step_y1 + 19)], fill=SUBTITLE_GRAY, width=1)
    draw.polygon([(step2_x + step1_w + step_gap, step_y1 + 19), (step2_x + step1_w + step_gap - 6, step_y1 + 19 - 4), (step2_x + step1_w + step_gap - 6, step_y1 + 19 + 4)], fill=SUBTITLE_GRAY)

    # Step 3: Record Sets
    step3_x = step2_x + step1_w + step_gap
    draw.rounded_rectangle((step3_x, step_y1, step3_x + step1_w, step_y1 + 38), 8, fill=(CORAL[0], CORAL[1], CORAL[2], 60))
    draw.text((step3_x + 10, step_y1 + 12), "记录组数", font=FONT_SMALL, fill=WHITE)

    # Step flow row 2
    step_y2 = y_training + 135

    # E1RM formula
    draw.rounded_rectangle((x4 + 18, step_y2, x4 + 130, step_y2 + 38), 8, fill=NODE_BG)
    draw.text((x4 + 28, step_y2 + 12), "E1RM = W×(1+R/30)", font=FONT_SMALL, fill=TEAL)

    # Volume formula
    draw.rounded_rectangle((x4 + 140, step_y2, x4 + 275, step_y2 + 38), 8, fill=NODE_BG)
    draw.text((x4 + 150, step_y2 + 12), "肌群容量 = W×R×系数", font=FONT_SMALL, fill=TEAL)

    # Complete button
    draw.rounded_rectangle((x4 + 285, step_y2, x4 + 322, step_y2 + 38), 8, fill=NODE_BG)
    draw.text((x4 + 293, step_y2 + 12), "完成", font=FONT_SMALL, fill=WHITE)

    # Arrow 4->5 (right)
    arrow45_x = x4 + training_w
    arrow45_y = y_training + training_h // 2
    arrow45_mid = arrow45_x + gap // 2 + 10

    draw.line([(arrow45_x, arrow45_y), (arrow45_mid - 8, arrow45_y)], fill=SUBTITLE_GRAY, width=2)
    draw.polygon([(arrow45_mid - 8, arrow45_y), (arrow45_mid - 16, arrow45_y - 6), (arrow45_mid - 16, arrow45_y + 6)], fill=SUBTITLE_GRAY)

    # ============ NODE 5: RECOVERY ============
    x5 = start_x + 4 * (node_w + gap) + 30
    recovery_h = 220

    draw.rounded_rectangle((x5, y_recovery, x5 + node_w, y_recovery + recovery_h), 14, fill=NODE_BG)
    draw.text((x5 + 22, y_recovery + 22), "05", font=FONT_LABEL, fill=TEAL)
    draw.text((x5 + 22, y_recovery + 48), "RECOVERY", font=FONT_NODE_TITLE, fill=WHITE)
    draw.text((x5 + 22, y_recovery + 80), "恢复状态计算", font=FONT_NODE_DESC, fill=SUBTITLE_GRAY)

    # Recovery factors
    factor_y = y_recovery + 115
    draw.rounded_rectangle((x5 + 15, factor_y, x5 + node_w - 15, factor_y + 35), 8, fill=(40, 45, 55))
    draw.text((x5 + 25, factor_y + 10), "训练量因子 × 睡眠", font=FONT_SMALL, fill=TEAL)

    # Formula
    formula_y = y_recovery + 160
    draw.rounded_rectangle((x5 + 15, formula_y, x5 + node_w - 15, formula_y + 35), 8, fill=(40, 45, 55))
    draw.text((x5 + 25, formula_y + 10), "恢复分 = 均分 - 睡眠扣减", font=FONT_SMALL, fill=SUBTITLE_GRAY)

    # Recommendation
    rec_y = y_recovery + 170
    draw.rounded_rectangle((x5 + 15, rec_y + 25, x5 + node_w - 15, rec_y + 55), 8, fill=(TEAL[0], TEAL[1], TEAL[2], 50))
    draw.text((x5 + 25, rec_y + 35), "建议: REST/LIGHT/TRAIN", font=FONT_SMALL, fill=WHITE)

    # ============ BODY DATA SECTION ============
    data_y = 640

    # Divider
    draw.line([(80, data_y - 30), (WIDTH - 80, data_y - 30)], fill=(55, 58, 68), width=1)
    draw.text((80, data_y - 15), "BODY DATA TRACKING", font=FONT_SUBTITLE, fill=SUBTITLE_GRAY)

    # Three data nodes
    data_node_w = 200
    data_node_h = 95
    data_gap = 50
    data_start = start_x + 80

    # Node: Weight
    draw.rounded_rectangle((data_start, data_y + 25, data_start + data_node_w, data_y + 25 + data_node_h), 12, fill=NODE_BG)
    draw.text((data_start + 18, data_y + 40), "WEIGHT", font=FONT_LABEL, fill=CORAL)
    draw.text((data_start + 18, data_y + 68), "体重记录 / 趋势图", font=FONT_NODE_DESC, fill=SUBTITLE_GRAY)

    # Arrow
    arr_x1 = data_start + data_node_w
    arr_x2 = data_start + data_node_w + data_gap
    draw.line([(arr_x1, data_y + 72), (arr_x2 - 8, data_y + 72)], fill=SUBTITLE_GRAY, width=2)
    draw.polygon([(arr_x2 - 8, data_y + 72), (arr_x2 - 16, data_y + 72 - 6), (arr_x2 - 16, data_y + 72 + 6)], fill=SUBTITLE_GRAY)

    # Node: Measurements
    data2_x = data_start + data_node_w + data_gap
    draw.rounded_rectangle((data2_x, data_y + 25, data2_x + data_node_w, data_y + 25 + data_node_h), 12, fill=NODE_BG)
    draw.text((data2_x + 18, data_y + 40), "MEASURE", font=FONT_LABEL, fill=TEAL)
    draw.text((data2_x + 18, data_y + 68), "围度记录 / 对比图", font=FONT_NODE_DESC, fill=SUBTITLE_GRAY)

    # Arrow
    arr2_x1 = data2_x + data_node_w
    arr2_x2 = data2_x + data_node_w + data_gap
    draw.line([(arr2_x1, data_y + 72), (arr2_x2 - 8, data_y + 72)], fill=SUBTITLE_GRAY, width=2)
    draw.polygon([(arr2_x2 - 8, data_y + 72), (arr2_x2 - 16, data_y + 72 - 6), (arr2_x2 - 16, data_y + 72 + 6)], fill=SUBTITLE_GRAY)

    # Node: Photos
    data3_x = data2_x + data_node_w + data_gap
    draw.rounded_rectangle((data3_x, data_y + 25, data3_x + data_node_w, data_y + 25 + data_node_h), 12, fill=NODE_BG)
    draw.text((data3_x + 18, data_y + 40), "PHOTOS", font=FONT_LABEL, fill=AMBER)
    draw.text((data3_x + 18, data_y + 68), "进度照片 / 时间线", font=FONT_NODE_DESC, fill=SUBTITLE_GRAY)

    # ============ LEGEND & FOOTER ============
    footer_y = HEIGHT - 70

    # Version
    draw.text((80, footer_y), "v1.0  |  2026", font=FONT_SMALL, fill=(80, 82, 95))

    # Legend
    legend_x = WIDTH - 520
    draw.text((legend_x, footer_y), "LEGEND:", font=FONT_LABEL, fill=SUBTITLE_GRAY)

    # Legend items
    items = [
        (CORAL, "训练 / 执行"),
        (TEAL, "恢复 / 计算"),
        (AMBER, "计划 / 能量"),
    ]

    for i, (color, label) in enumerate(items):
        x = legend_x + 95 + i * 125
        draw.rounded_rectangle((x, footer_y + 2, x + 14, footer_y + 16), 3, fill=color)
        draw.text((x + 20, footer_y), label, font=FONT_SMALL, fill=SUBTITLE_GRAY)

    # ============ DECORATIVE ACCENTS ============
    # Bottom right corner mark
    draw.line([(WIDTH - 100, HEIGHT - 100), (WIDTH - 100, HEIGHT - 60)], fill=(CORAL[0], CORAL[1], CORAL[2], 80), width=2)
    draw.line([(WIDTH - 100, HEIGHT - 60), (WIDTH - 60, HEIGHT - 60)], fill=(CORAL[0], CORAL[1], CORAL[2], 80), width=2)

    return img

if __name__ == "__main__":
    print("Generating refined flow chart...")
    img = draw_flow_chart()

    output_path = "/Users/eatong/eaTong_projects/aiji/docs/技术文档/aiji-flow-chart.png"
    img.save(output_path, "PNG", quality=95)
    print(f"Flow chart saved to: {output_path}")
    print(f"Image size: {img.size}")
