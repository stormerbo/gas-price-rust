import React from 'react';
import dayjs from 'dayjs';
import lunarPlugin from 'dayjs-plugin-lunar';

dayjs.extend(lunarPlugin);

/**
 * 获取日期的农历信息
 * 返回 { text, isSpecial }
 * - text: 显示的农历文字（节日 > 节气 > 农历日）
 * - isSpecial: 是否为特殊日期（节日/节气），用红色显示
 */
function getLunarInfo(date) {
  try {
    const d = dayjs(date);
    const lunarDay = d.toLunarDay();
    const solarDay = lunarDay.getSolarDay();

    // 优先显示农历节日
    const lunarFestival = lunarDay.getFestival();
    if (lunarFestival) {
      return { text: lunarFestival.getName(), isSpecial: true };
    }

    // 其次显示公历节日
    const solarFestival = solarDay.getFestival();
    if (solarFestival) {
      return { text: solarFestival.getName(), isSpecial: true };
    }

    // 再次显示节气
    const termDay = solarDay.getTermDay();
    if (termDay && termDay.getDayIndex() === 0) {
      return { text: termDay.getSolarTerm().getName(), isSpecial: true };
    }

    // 默认显示农历日期，初一时显示月份
    const dayName = lunarDay.getName();
    if (dayName === '初一') {
      return { text: lunarDay.getLunarMonth().getName(), isSpecial: false };
    }
    return { text: dayName, isSpecial: false };
  } catch {
    return { text: '', isSpecial: false };
  }
}

/**
 * Ant Design DatePicker 的 cellRender
 * 保留 originNode（.ant-picker-cell-inner）结构，追加农历文字
 */
export function lunarCellRender(current, info) {
  if (info.type !== 'date') return info.originNode;

  const { text, isSpecial } = getLunarInfo(current.toDate());

  return React.cloneElement(info.originNode, {
    style: {
      ...info.originNode.props.style,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      lineHeight: 1,
      height: 'auto',
      minHeight: 24,
    },
  }, (
    <>
      <span>{current.date()}</span>
      <span className={`lunar-sub${isSpecial ? ' lunar-special' : ''}`}>
        {text}
      </span>
    </>
  ));
}
