function AddressFormat({ address }) {
  return (
    address.substr(0, 5) +
    '...' +
    address.substr(address.length - 4, address.length)
  )
}

export default AddressFormat
