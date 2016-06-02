import React, { PropTypes } from 'react'
import { findDOMNode } from 'react-dom'
import Component from 'react-class'

import moment from 'moment'
import assign from 'object-assign'

import clampRange from './clampRange'
import toMoment from './toMoment'
import join from './join'
import isInRange from './utils/isInRange'

import NavBar from './NavBar'
import Footer from './Footer'
import bemFactory from './bemFactory'
import joinFunctions from './joinFunctions'
import assignDefined from './assignDefined'

import BasicMonthView, { getDaysInMonthView } from './BasicMonthView'

let TODAY

const NAV_KEYS = {
  ArrowUp: -7,
  ArrowDown: 7,
  ArrowLeft: -1,
  ArrowRight: 1,

  PageUp(mom) {
    return mom.add(-1, 'month')
  },
  PageDown(mom) {
    return mom.add(1, 'month')
  },
  Home(mom) {
    return mom.startOf('month')
  },
  End(mom) {
    return mom.endOf('month')
  }
}

const RENDER_DAY = (props) => {
  return <div {...props} />
}

const isValidActiveDate = function (timestamp, props) {
  if (!props) {
    throw new Error('props is mandatory in isValidActiveDate')
  }

  const dayProps = props.dayPropsMap[timestamp]

  if (dayProps && dayProps.disabled) {
    return false
  }

  return true
}

const isInView = function (mom, props) {
  if (!props) {
    throw new Error('props is mandatory in isInView')
  }

  const daysInView = props.daysInView

  return isInRange(mom, { range: daysInView, inclusive: true })
}

const prepareViewDate = function (props, state) {
  const viewDate = props.viewDate === undefined ?
        state.viewDate :
        props.viewDate

  if (!viewDate && props.moment) {
    return toMoment(props.moment)
  }

  return viewDate
}

const prepareDate = function (props, state) {
  if (props.range) {
    return null
  }

  return props.date === undefined ?
          state.date :
          props.date
}

const prepareRange = function (props, state) {
  if (props.moment) {
    return null
  }

  return props.partialRange ?
    props.range || state.range :
    state.range || props.range
}

const prepareActiveDate = function (props, state) {
  const fallbackDate = prepareDate(props, state) || ((prepareRange(props, state) || [])[0])

  const activeDate = props.activeDate === undefined ?
      // only fallback to date if activeDate not specified
      (state.activeDate || fallbackDate) :
      props.activeDate

  const daysInView = props.daysInView

  if (activeDate && daysInView && props.constrainActiveInView) {
    const activeMoment = this.toMoment(activeDate)

    if (!isInView(activeMoment, props)) {
      const date = fallbackDate
      const dateMoment = this.toMoment(date)

      if (date && isInView(dateMoment, props) && isValidActiveDate(+dateMoment, props)) {
        return date
      }

      return null
    }
  }

  return isValidActiveDate(+activeDate, props) ? activeDate : null
}

export default class MonthView extends Component {

  isInView(mom, props) {
    return isInView(mom, props || this.p)
  }

  constructor(props) {
    super(props)

    this.state = {
      range: props.defaultRange,
      date: props.defaultDate,
      activeDate: props.defaultActiveDate,
      viewDate: props.defaultViewDate
    }
  }

  componentWillMount() {
    this.updateBem(this.props)
    this.updateToMoment(this.props)
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.defaultClassName != this.props.defaultClassName) {
      this.updateBem(nextProps)
    }

    this.updateToMoment(nextProps)
  }

  updateBem(props) {
    this.bem = bemFactory(props.defaultClassName)
  }

  updateToMoment(props) {
    this.toMoment = (value, dateFormat) => {
      return toMoment(value, {
        locale: props.locale,
        dateFormat: dateFormat || props.dateFormat
      })
    }

    TODAY = +this.toMoment().startOf('day')
  }

  prepareClassName(props) {
    return join(
      props.className,
      this.bem(),
      this.bem(null, `theme-${props.theme}`)
    )
  }

  prepareProps(thisProps, state) {
    const props = this.p = assign({}, thisProps)

    state = state || this.state

    props.dayPropsMap = {}
    props.className = this.prepareClassName && this.prepareClassName(props)

    const { minDate, maxDate } = props

    if (minDate) {
      props.minDateMoment = this.toMoment(props.minDate).startOf('day')
      props.minDate = +props.minDateMoment
    }

    if (maxDate) {
      props.maxDateMoment = this.toMoment(props.maxDate)
      props.maxDate = +props.maxDateMoment
    }

    const date = prepareDate(props, state)

    if (date) {
      props.moment = props.moment || (props.range ? null : this.toMoment(date).startOf('day'))
      props.timestamp = props.moment ? +props.moment : null
    }

    props.viewMoment = props.viewMoment || this.toMoment(prepareViewDate(props, state))

    if (props.constrainViewDate && props.minDate && props.viewMoment.isBefore(props.minDate)) {
      props.minContrained = true
      props.viewMoment = this.toMoment(props.minDate)
    }

    if (props.constrainViewDate && props.maxDate && props.viewMoment.isAfter(props.maxDate)) {
      props.maxConstrained = true
      props.viewMoment = this.toMoment(props.maxDate)
    }

    props.viewMonthStart = this.toMoment(props.viewMoment).startOf('month')
    props.viewMonthEnd = this.toMoment(props.viewMoment).endOf('month')

    const range = prepareRange(props, state)

    if (range) {
      props.range = range.map(d => this.toMoment(d).startOf('day'))
      props.rangeStart = state.rangeStart || (props.range.length == 1 ? props.range[0] : null)
    }

    props.daysInView = getDaysInMonthView(props.viewMoment, props)

    const activeDate = prepareActiveDate.call(this, props, state)

    if (activeDate) {
      props.activeDate = +this.toMoment(activeDate).startOf('day')
    }

    return props
  }

  getViewMoment() {
    return this.p.viewMoment
  }

  getViewSize() {
    return 1
  }

  // handleViewMouseLeave(){
  //   this.state.range && this.setState({ range: null })
  // }

  preparePrevNextClassName(timestamp, props) {
    const { viewMonthStart, viewMonthEnd } = props

    const before = timestamp < viewMonthStart
    const after = timestamp > viewMonthEnd

    const thisMonth = !before && !after

    return join(
      timestamp == TODAY && this.bem('day--today'),

      before && this.bem('day--prev-month'),
      before && !props.showDaysBeforeMonth && this.bem('day--hidden'),

      after && this.bem('day--next-month'),
      after && !props.showDaysAfterMonth && this.bem('day--hidden'),

      thisMonth && this.bem('day--this-month')
    )
  }

  prepareMinMaxProps(timestamp, props) {
    const classes = []

    let isBeforeMinDate = false
    let isAfterMaxDate = false

    const { minDate, maxDate } = props

    if (minDate && timestamp < minDate) {
      classes.push(
        this.bem('day--disabled-min')
      )
      isBeforeMinDate = true
    }

    if (maxDate && timestamp > maxDate) {
      classes.push(
        this.bem('day--disabled-max')
      )
      isAfterMaxDate = true
    }

    return {
      className: join(classes),
      isBeforeMinDate,
      isAfterMaxDate,
      disabled: isBeforeMinDate || isAfterMaxDate
    }
  }

  prepareWeekendClassName(dateMoment, { highlightWeekends }) {
    const weekDay = dateMoment.day()

    if (weekDay === 0 /* Sunday */ || weekDay === 6 /* Saturday */) {
      return join(
        this.bem('day--weekend'),
        highlightWeekends && this.bem('day--weekend-highlight')
      )
    }

    return ''
  }

  prepareRangeProps(dateMoment, props) {
    const range = props.range

    let inRange = false

    const className = []

    if (range) {
      let [rangeStart, rangeEnd] = range

      if (!range.length) {
        rangeStart = props.rangeStart
      }

      if (rangeStart && dateMoment.isSame(rangeStart)) {
        className.push(this.bem('day--range-start'))
        className.push(this.bem('day--in-range'))

        if (!rangeEnd) {
          className.push(this.bem('day--range-end'))
        }

        inRange = true
      }

      if (rangeEnd && dateMoment.isSame(rangeEnd)) {
        className.push(this.bem('day--range-end'))
        className.push(this.bem('day--in-range'))

        inRange = true
      }

      if (!inRange && isInRange(dateMoment, range)) {
        className.push(this.bem('day--in-range'))

        inRange = true
      }
    }

    return {
      inRange,
      className: join(className)
    }
  }

  prepareDayProps(renderDayProps, props) {
    const { timestamp, dateMoment, className } = renderDayProps

    props = props || this.p
    const result = {}

    const minMaxProps = this.prepareMinMaxProps(timestamp, props)
    const rangeProps = this.prepareRangeProps(dateMoment, props)

    const weekendClassName = this.prepareWeekendClassName(dateMoment, props)
    const prevNextClassName = this.preparePrevNextClassName(timestamp, props)

    const currentTimestamp = props.timestamp

    assign(
      result,
      minMaxProps,
      rangeProps,
      {
        children: <div className={this.bem('day-text')}>
          {renderDayProps.day}
        </div>,
        className: join([
          minMaxProps.className,
          rangeProps.className,
          prevNextClassName,
          weekendClassName,
          timestamp == currentTimestamp ? this.bem('day--value') : null,
          timestamp == props.activeDate ? this.bem('day--active') : null,
          className
        ])
      }
    )

    if (!result.disabled && props.isDisabledDay) {
      result.disabled = props.isDisabledDay(renderDayProps, props)
    }

    return result
  }

  focus() {
    const domNode = findDOMNode(this)

    if (domNode) {
      domNode.focus()
    }
  }

  onDayTextMouseEnter({ dateMoment, timestamp }) {
    if (!this.state.focused) {
      this.focus()
    }

    this.onActiveDateChange({ dateMoment, timestamp })
  }

  renderDay(renderProps) {
    const props = this.p

    const { dateMoment, timestamp } = renderProps

    assign(
      renderProps,
      this.prepareDayProps(renderProps, props)
    )

    if (props.range && props.highlightRangeOnMouseMove) {
      renderProps.onMouseEnter = this.handleDayMouseEnter.bind(this, renderProps)
    }

    if (typeof props.onRenderDay === 'function') {
      renderProps = props.onRenderDay(renderProps)
    }

    if (renderProps.disabled) {
      renderProps.className = join(
        this.bem('day--disabled'),
        renderProps.className
      )
    } else {
      const eventParam = { dateMoment, timestamp }

      const onClick = this.handleClick.bind(this, eventParam)
      const prevOnClick = renderProps.onClick

      renderProps.onClick = prevOnClick ?
                              (...args) => {
                                prevOnClick(...args)
                                onClick(...args)
                              }
                              :
                              onClick

      if (props.activateOnHover && this.props.activeDate !== null) {
        const onMouseEnter = this.onDayTextMouseEnter.bind(this, eventParam)
        const prevOnMouseEnter = renderProps.onMouseEnter

        renderProps.onMouseEnter = prevOnMouseEnter ?
                                    (...args) => {
                                      prevOnMouseEnter(...args)
                                      onMouseEnter(...args)
                                    }
                                    :
                                    onMouseEnter
      }
    }

    props.dayPropsMap[timestamp] = renderProps

    const renderFunction = props.renderDay || RENDER_DAY

    let result = renderFunction(renderProps)

    if (result === undefined) {
      result = RENDER_DAY(renderProps)
    }

    return result
  }

  render() {
    const props = this.p = this.prepareProps(this.props)

    return <BasicMonthView
      tabIndex={0}
      {...props}

      renderChildren={this.renderChildren}

      onKeyDown={this.onViewKeyDown}
      onFocus={this.onFocus}
      onBlur={this.onBlur}

      viewMonthStart={null}
      viewMonthEnd={null}

      minDate={null}
      maxDate={null}

      viewDate={null}
      range={null}

      renderDay={this.renderDay}
      viewMoment={props.viewMoment}
      onMouseLeave={props.highlightRangeOnMouseMove && this.handleViewMouseLeave}
    />
  }

  handleViewMouseLeave(event) {
    if (this.props.onMouseLeave) {
      this.props.onMouseLeave(event)
    }
  }

  renderChildren(children) {
    const props = this.p
    const navBar = this.renderNavBar(props)
    const footer = this.renderFooter(props)

    const result = [
      navBar,
      children,
      footer
    ]

    if (props.renderChildren) {
      return props.renderChildren(result)
    }

    return result
  }

  renderFooter(props) {
    if (!props.footer) {
      return null
    }

    const renderFooter = props.renderFooter

    const footerFnProps = {
      onTodayClick: props.onFooterTodayClick,
      onClearClick: props.onFooterClearClick,
      onOkClick: props.onFooterOkClick,
      onCancelClick: props.onFooterCancelClick
    }

    const childFooter = React.Children.toArray(props.children)
      .filter(c => c && c.props && c.props.isDatePickerFooter)[0]

    const childFooterProps = childFooter ? childFooter.props : null

    if (childFooterProps) {
      // also take into account the props on childFooter
      // so we merge those with the other props already built
      Object.keys(footerFnProps).forEach(key => {
        if (childFooter.props[key]) {
          footerFnProps[key] = joinFunctions(footerFnProps[key], childFooter.props[key])
        }
      })
    }

    const footerProps = assignDefined({}, footerFnProps, {
      todayButton: props.todayButton,
      todayButtonText: props.todayButtonText,
      clearButton: props.clearButton,
      clearButtonText: props.clearButtonText,

      okButton: props.okButton,
      okButtonText: props.okButtonText,

      cancelButton: props.cancelButton,
      cancelButtonText: props.cancelButtonText,

      clearDate: props.clearDate || props.footerClearDate
    })

    if (childFooter) {
      if (renderFooter) {
        return renderFooter(assign({}, childFooter.props, footerProps))
      }

      return React.cloneElement(childFooter, footerProps)
    }

    if (renderFooter) {
      return renderFooter(footerProps)
    }

    return <Footer {...footerProps} />
  }

  renderNavBar(props) {
    const theme = props.theme

    const childNavBar = React.Children.toArray(props.children)
      .filter(c => c && c.props && c.props.isDatePickerNavBar)[0]

    if (!childNavBar) {
      if (props.navigation || props.renderNavBar) {
        return this.renderNavBarComponent({
          // prevDisabled,
          // nextDisabled,
          minDate: props.minDate,
          maxDate: props.maxDate,
          theme,
          secondary: true,
          viewMoment: props.viewMoment,
          onViewDateChange: this.onNavViewDateChange
        })
      }

      return null
    }

    const navBarProps = assign({}, childNavBar.props, {
      viewMoment: props.viewMoment,
      theme,
      minDate: props.minDate,
      maxDate: props.maxDate
      // prevDisabled,
      // nextDisabled
    })

    const prevOnViewDateChange = navBarProps.onViewDateChange
    let onViewDateChange = this.onViewDateChange

    if (prevOnViewDateChange) {
      onViewDateChange = (...args) => {
        prevOnViewDateChange(...args)
        this.onNavViewDateChange(...args)
      }
    }

    navBarProps.onViewDateChange = onViewDateChange

    if (navBarProps) {
      return this.renderNavBarComponent(navBarProps)
    }

    return null
  }

  renderNavBarComponent(navBarProps) {
    if (this.props.renderNavBar) {
      return this.props.renderNavBar(navBarProps)
    }

    return <NavBar {...navBarProps} />
  }

  onFocus(event) {
    this.setState({
      focused: true
    })

    this.props.onFocus(event)
  }

  onBlur(event) {
    this.setState({
      focused: false
    })

    this.props.onBlur(event)
  }

  onViewKeyDown(event) {
    const key = event.key

    if (this.props.onKeyDown) {
      if (this.props.onKeyDown(event) === false) {
        return
      }
    }

    if (key == 'Enter' && this.p.activeDate) {
      this.confirm(this.p.activeDate, event)
    }

    const navKeys = this.p.navKeys || NAV_KEYS
    const dir = navKeys[key]

    if (!dir) {
      return
    }

    event.preventDefault()
    this.navigate(dir, event)
  }

  confirm(date, event) {
    event.preventDefault()

    if (this.props.confirm) {
      return this.props.confirm(date, event)
    }

    const dateMoment = this.toMoment(date)

    this.select({ dateMoment, timestamp: +dateMoment }, event)

    return undefined
  }

  navigate(dir, event) {
    const props = this.p

    const getNavigationDate = (dir, date, dateFormat) => {
      const mom = moment.isMoment(date) ? date : this.toMoment(date, dateFormat)

      return typeof dir == 'function' ?
          dir(mom) :
          mom.add(dir, 'day')
    }

    if (props.navigate) {
      return props.navigate(dir, event, getNavigationDate)
    }

    event.preventDefault()

    if (props.activeDate) {
      const nextMoment = getNavigationDate(dir, props.activeDate)

      this.gotoViewDate({ dateMoment: nextMoment })
    }

    return undefined
  }

  handleDayMouseEnter(dayProps) {
    const range = this.props.range

    if (range && range.length == 1) {
      const [start] = range

      this.setState({
        range: [start, dayProps.date].sort((a, b) => a - b)
      })
    } else if (this.state.range) {
      this.setState({
        range: null
      })
    }
  }

  handleClick({ timestamp, dateMoment }, event) {
    const props = this.p

    if (props.minDate && timestamp < props.minDate) {
      return
    }

    if (props.maxDate && timestamp > props.maxDate) {
      return
    }

    event.target.value = timestamp

    this.select({ dateMoment, timestamp }, event)
  }

  select({ dateMoment, timestamp }, event) {
    if (this.props.select) {
      return this.props.select({ dateMoment, timestamp }, event)
    }

    if (!timestamp) {
      timestamp = +dateMoment
    }

    this.gotoViewDate({ dateMoment, timestamp })

    const props = this.p
    const range = props.range

    if (range) {
      this.selectRange({ dateMoment, timestamp }, event)
    } else {
      this.onChange({ dateMoment, timestamp }, event)
    }

    return undefined
  }

  selectRange({ dateMoment, timestamp }, event) {
    const props = this.p
    const range = props.range
    const rangeStart = props.rangeStart

    if (!rangeStart) {
      this.setState({
        rangeStart: dateMoment
      })

      if (range.length == 2) {
        this.onRangeChange([], event)
      }
    } else {
      this.setState({
        rangeStart: null
      })

      this.onRangeChange(
        clampRange([rangeStart, dateMoment]),
        event
      )
    }
  }

  format(mom) {
    return mom.format(this.props.dateFormat)
  }

  onRangeChange(range, event) {
    this.setState({
      range: this.props.range === undefined ? range : null
    })

    if (this.props.onRangeChange) {
      const newRange = range.map(m => {
        const dateMoment = this.toMoment(m)

        return {
          dateString: dateMoment.format(this.props.dateFormat),
          dateMoment,
          timestamp: +dateMoment
        }
      })

      const formatted = newRange.map(o => o.dateString)

      this.props.onRangeChange(formatted, newRange, event)
    }
  }

  onChange({ dateMoment, timestamp }, event) {
    if (this.props.date === undefined) {
      this.setState({
        date: timestamp
      })
    }

    if (this.props.onChange) {
      const dateString = this.format(dateMoment)
      this.props.onChange(dateString, { dateMoment, timestamp, dateString }, event)
    }
  }

  onNavViewDateChange(dateString, { dateMoment, timestamp }) {
    this.onViewDateChange({ dateMoment, timestamp })
  }

  onViewDateChange({ dateMoment, timestamp }) {
    if (this.props.viewDate === undefined && this.props.navOnDateClick) {
      this.setState({
        viewDate: timestamp
      })
    }

    if (this.props.onViewDateChange) {
      const dateString = this.format(dateMoment)

      this.props.onViewDateChange(dateString, { dateMoment, dateString, timestamp })
    }
  }

  isValidActiveDate(date, props) {
    return isValidActiveDate(date, props || this.p)
  }

  onActiveDateChange({ dateMoment, timestamp }) {
    if (!isValidActiveDate(timestamp, this.p)) {
      return
    }

    const props = this.p
    const range = props.range

    if (range && props.rangeStart) {
      const newRange = clampRange([props.rangeStart, dateMoment])

      if (props.partialRange) {
        this.onRangeChange(newRange)
      }

      this.setState({
        rangeStart: props.rangeStart,
        range: newRange
      })
    }

    if (this.props.activeDate === undefined) {
      this.setState({
        activeDate: timestamp
      })
    }

    if (this.props.onActiveDateChange) {
      const dateString = this.format(dateMoment)
      this.props.onActiveDateChange(dateString, { dateMoment, timestamp, dateString })
    }
  }

  gotoViewDate({ dateMoment, timestamp }) {
    if (!timestamp) {
      timestamp = +dateMoment
    }

    this.onViewDateChange({ dateMoment, timestamp })
    this.onActiveDateChange({ dateMoment, timestamp })
  }
}

MonthView.defaultProps = {
  defaultClassName: 'react-date-picker__month-view',
  dateFormat: 'YYYY-MM-DD',

  theme: 'default',

  onBlur: () => {},
  onFocus: () => {},

  partialRange: true,

  activateOnHover: false,
  constrainActiveInView: false,

  showDaysBeforeMonth: true,
  showDaysAfterMonth: true,

  highlightWeekends: true,
  navOnDateClick: true,
  navigation: true,

  constrainViewDate: true,

  isDatePicker: true
}

MonthView.propTypes = {
  navOnDateClick: PropTypes.bool,
  isDisabledDay: PropTypes.func,

  onChange: PropTypes.func,
  onViewDateChange: PropTypes.func,
  onActiveDateChange: PropTypes.func
}

export { NAV_KEYS }
