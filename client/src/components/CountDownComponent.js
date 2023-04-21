import React from 'react'
import PropTypes from 'prop-types'
import { View, Text, AppState } from 'react-native'

class CountDownComponent extends React.Component {
  static propTypes = {
    id: PropTypes.string,
    until: PropTypes.number,
    onChange: PropTypes.func,
    onFinish: PropTypes.func,
  }

  state = {
    until: Math.max(this.props.until, 0),
    lastUntil: null,
    wentBackgroundAt: null,
  }

  constructor(props) {
    super(props)
    this.timer = setInterval(this.updateTimer, 1000)
  }

  componentDidMount() {
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this._handleAppStateChange,
    )
  }

  componentWillUnmount() {
    clearInterval(this.timer)
    this.appStateSubscription.remove()
  }

  componentDidUpdate(prevProps, prevState) {
    if (
      this.props.until !== prevProps.until ||
      this.props.id !== prevProps.id
    ) {
      this.setState({
        lastUntil: 0,
        until: Math.max(this.props.until, 0),
      })
    }
  }

  _handleAppStateChange = currentAppState => {
    const { until, wentBackgroundAt } = this.state
    if (
      currentAppState === 'active' &&
      wentBackgroundAt &&
      this.props.running
    ) {
      const diff = (Date.now() - wentBackgroundAt) / 1000.0
      this.setState({
        lastUntil: until,
        until: Math.max(0, until - diff),
      })
    }
    if (currentAppState === 'background') {
      this.setState({ wentBackgroundAt: Date.now() })
    }
  }

  secondsToDhms = () => {
    const { until } = this.state
    let seconds = Number(until)
    var ss = parseInt(seconds) // 秒
    var mm = 0 // 分
    var hh = 0 // 小时
    if (ss > 60) {
      mm = parseInt(ss / 60)
      ss = parseInt(ss % 60)
    }
    if (mm > 60) {
      hh = parseInt(mm / 60)
      mm = parseInt(mm % 60)
    }
    var result = ('00' + parseInt(ss)).slice(-2)
    if (mm > 0) {
      result = ('00' + parseInt(mm)).slice(-2) + ':' + result
    } else {
      result = '00:' + result
    }
    if (hh > 0) {
      result = ('00' + parseInt(hh)).slice(-2) + ':' + result
    }
    return result
  }

  updateTimer = () => {
    if (this.state.lastUntil === this.state.until || !this.props.running) {
      return
    }
    if (
      this.state.until === 1 ||
      (this.state.until === 0 && this.state.lastUntil !== 1)
    ) {
      if (this.props.onFinish) {
        this.props.onFinish()
      }
      if (this.props.onChange) {
        this.props.onChange(this.state.until)
      }
    }

    if (this.state.until === 0) {
      this.setState({ lastUntil: 0, until: 0 })
    } else {
      if (this.props.onChange) {
        this.props.onChange(this.state.until)
      }
      this.setState({
        lastUntil: this.state.until,
        until: Math.max(0, this.state.until - 1),
      })
    }
  }

  renderCountDown = () => {
    return <Text style={this.props.textStyle}>{this.secondsToDhms()}</Text>
  }

  render() {
    return <View style={this.props.style}>{this.renderCountDown()}</View>
  }
}

CountDownComponent.defaultProps = {
  until: 0,
  size: 15,
  running: true,
}

export default CountDownComponent
