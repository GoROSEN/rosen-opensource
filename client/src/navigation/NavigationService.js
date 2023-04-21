import { CommonActions } from '@react-navigation/native'

let _navigator

function setTopLevelNavigator(navigatorRef) {
  _navigator = navigatorRef
}

function navigate(routeName, params) {
  _navigator.dispatch(
    CommonActions.navigate({
      routeName,
      params,
    }),
  )
}

function reset(params) {
  _navigator.dispatch(CommonActions.reset(params))
}

function getRootState() {
  return _navigator.getRootState()
}

export default {
  navigate,
  reset,
  getRootState,
  setTopLevelNavigator,
}
