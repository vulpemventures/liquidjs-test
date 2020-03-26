(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.fixtures = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(
      uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)
    ))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],2:[function(require,module,exports){
(function (Buffer){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var customInspectSymbol =
  (typeof Symbol === 'function' && typeof Symbol.for === 'function')
    ? Symbol.for('nodejs.util.inspect.custom')
    : null

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    var proto = { foo: function () { return 42 } }
    Object.setPrototypeOf(proto, Uint8Array.prototype)
    Object.setPrototypeOf(arr, proto)
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  Object.setPrototypeOf(buf, Buffer.prototype)
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw new TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof SharedArrayBuffer !== 'undefined' &&
      (isInstance(value, SharedArrayBuffer) ||
      (value && isInstance(value.buffer, SharedArrayBuffer)))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Object.setPrototypeOf(Buffer.prototype, Uint8Array.prototype)
Object.setPrototypeOf(Buffer, Uint8Array)

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  Object.setPrototypeOf(buf, Buffer.prototype)

  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}
if (customInspectSymbol) {
  Buffer.prototype[customInspectSymbol] = Buffer.prototype.inspect
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [val], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += hexSliceLookupTable[buf[i]]
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  Object.setPrototypeOf(newBuf, Buffer.prototype)

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  } else if (typeof val === 'boolean') {
    val = Number(val)
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

// Create lookup table for `toString('hex')`
// See: https://github.com/feross/buffer/issues/219
var hexSliceLookupTable = (function () {
  var alphabet = '0123456789abcdef'
  var table = new Array(256)
  for (var i = 0; i < 16; ++i) {
    var i16 = i * 16
    for (var j = 0; j < 16; ++j) {
      table[i16 + j] = alphabet[i] + alphabet[j]
    }
  }
  return table
})()

}).call(this,require("buffer").Buffer)
},{"base64-js":1,"buffer":2,"ieee754":3}],3:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],4:[function(require,module,exports){
(function (Buffer){
module.exports = {
  confidentialTx: {
    blindingPrivkeys: [
      Buffer.from(
        '13d4dbfdb5074705e6b9758d1542d7dd8c03055086c0da421620eaa04717a9f7',
        'hex',
      ),
    ],
    nonWitnessUtxo: Buffer.from(
      '020000000101bb6d18772599ae3ad9c44c524d63b666747c1c195c6f516a41a8d5f4a' +
        '32eef05010000001716001408a2534a4b37e12c371886ead381981413eec5edfdffff' +
        'ff030b0cbc7820f47ecff027603c63c52f715884852f2bebbbf66e7cedb6de6682f3c' +
        'e089815430f14f51d3453af022276eebc951f24c2f0426c8f5abe1ce9c0a96dd5c502' +
        '49acd8a6f58a01e252221749432d2698d844c9e41e9f41783974aaf855f05c9f1976a' +
        '9145ced4a2aefa685ae6df3d3a80e1bcdbdc10b748688ac0b645f88d6c4578afcfaac' +
        '9a0a8467578f8ead7e6eb69d0fec6d789f566c9edd1a0848ff4f7b458e6e0d7dcec88' +
        '88867a60478de16020e851a3b09e7fccc0929871f0288cf3434028f883d787039eb2f' +
        '2914b387e87f7e645939db81eb6b992302909c17a9149791858e4777dcc414a3df9cf' +
        'd575356040c3336870125b251070e29ca19043cf33ccd7324e2ddab03ecc4ae0b5e77' +
        'c4fc0e5cf6c95a01000000000000aa7800000902000000000247304402202878cc5e9' +
        '9cf2d4e975eb3f4bcf09d704a607383348a0015d54af7e0aac1408602200106ac19ce' +
        'b108e2b618f805ef2f69c64670adce166cb804b2c98894a184123a012102b821ade98' +
        '31d6d30a8f8869bd8cbcffaa9621a5fab6de2332215c1dc56dc93ef00430100014e87' +
        '67b846b91d00fbce65f4237b91075568bde843d3d825dd434695e444f10f3f2b6515f' +
        '9bcd9eb9d04607bbbcad6f45bb86f7060377c71808d0061d0ad8cfefd4d0b60230000' +
        '0000000000019a900126613909c9d892d9d7900429dde9f4b253e7a6a5869efcc6b62' +
        '847423108377323937ce4c109553fce4df91697bcf188da1c91056abe31957ac360c4' +
        'b7836a442fff84c5d944c7c2b19396c4659914437a8fbd38e6a7a26c45c8870206500' +
        '25d802ed0140cde45d354481732a8dd6073c8a6a4e4ebd9e8e64c9559a7d240690c29' +
        'ed77261718b1c82aad645896f645d1ea2114227dcd8c65ca31f049f5cdda3593ffbe1' +
        'd198307e0a2b921c264d657f0e6df3600e509ce0c5c9201d856454278e59261ba6576' +
        'deb96736a54f4c167dfeb25059100a2613e926ff7a1c700f08ebe719d0df245183109' +
        'f2ceb7c0d0d683adbada40e638d9764606e125321b38c6b20ec742bf9cc76318ef011' +
        'fe968d52c78402053ca495769deb6b20e38e473f4efa751a8c1e59b2e60aeb6a65c67' +
        '59fc482a5d75c83e28666785aa481a15722a97497e35b5f79c0fa0cd12bc52847c5ec' +
        'ee473a4828062fb18eaf7df69b92182a69981ce0e354c52d95c26ed0b6017005b1eaf' +
        '1ba5124d457a3f90f363fb2f6c080ecaff037855c34f07398906d6f959710cdccd99b' +
        'efbbcdc4a67b76abbb94f876e855e5b6e5a158151e9e3f30d67f47c5eed75965e48db' +
        '2bdca30f6fa922889bd2cb2c4476260886efdfec46f8a079792ab563ae1179b943639' +
        '67481db61eed7558198d08c9e9d559859c41f7941cc3f8de5c2b1a5a20d1d5a5f5dd8' +
        'c99b1df710a4aedce155da417228fddc367e3d69d510b0f82d891fe1211d5b954ecfb' +
        '622f31e0353ddb67283f892788c922f6f0c215f9ee61a1fbf8c62465e1442b38fc242' +
        'ae83f754cc223595cc2a9f05796b89818b0ee62079ad15694c6d56c9a4d08ce2f4071' +
        '9cd47c8cc90b8015bb8833b716161dbdfd46040b2cb8b5f4c881075bc0f973cb5f38f' +
        'd1d92a8929f042b5d016605cefe6897ae517768c84d358e607b5e3dec35244ab2a8b8' +
        'd3afa7b15464d59003737d10c87e939c6b90dfc7055706691fbdf2221d515333b0ebd' +
        'f34b0635bb133fb5e9f8fa578976f1e1a99b4645bbb6630b5d6f00097217c46f6ba1f' +
        '7ebf8ef947e82f17f97f9633212455b50b56cb646c4155399dd9627093fb66bb78239' +
        'dfefe4b410979751f5cfd082239fd3bd39ddbc87fd55b492928805b6825cdefec6b07' +
        'e5194c5e661b863b04734019f7a90403d23d2f15634b639b627fdd34abf7ecfe0990a' +
        '221d3b516014c48cac4edbaa1257a6a6a3493394c0645c418f7341a0dcfbe614dbf78' +
        'b0384715e6f844bf41ac4e99a1e3398320f8f955fe628b6a0ba4bb8cbe36d141c7d21' +
        'e4886c3beabfaebb7807ff391bb93189eb0d2345eaa154ab6a0ded4fc042458904e2c' +
        'a41335e70225759bc77f2115990da8e55305910d13770958c908ed5f55fa289260f66' +
        'b520d20dd644b2d12ff1b71d1f67e315f1f54e9b7b6ce2bb20b613a93d95fb943e7a3' +
        'f512be065e1e05d59ae0018b75a126d510a30d1b4c5aaff8a3cb21d0347eca5ae93e5' +
        '36ffa4659dd9b868c4e2590a70102a03fbe980c409875fca7ef40c9be632ae0709137' +
        '1a5d2e65448a9a51129885fd51dbca34080bf10bfaf70b6e256a8627af30b550892e1' +
        '011f5fb9b165b9a9dc735336f67fd3032b21a4643c61d0990a625c04cd667cb327e21' +
        '740fa40399caeea4f4360ed41b7590d71c4bc65d3d79912fe442d312f2e32bea5efbe' +
        'edec7f1d317d81c9d8592c6d772f636d1733813668bb72039d5c8968ba640262f0932' +
        '602b5149b59a787dfce302167e3f11e59473d10e4f0fdd9e14fd2736d073c20ff646a' +
        '9e66819622a5f7495cb0045c3bf1d3fe3feee1d1ab14bbee70385ea24a43029478609' +
        '90381151374498dbc6c9db6415e153ac9944bf9aeeefec0036dab51ea026895870624' +
        '5ced580435a706aa270bffe0b605be08ae738abdbbf94f01e371774c0110a9d07c55c' +
        '5363891b081816aeff5d1a553ce46638af49b75b4404e83b8d898936b1c0abec8463c' +
        '0bdd3c1ee3bb8229bf6e36de7fe5d3436436db413ead501ddf6f1ca17fdbfffd6e9d8' +
        '87ab4975ec563e446cc6fc77952848d76e7c593fbdca0827f455914e3e28aa5b1f2dc' +
        '65bf89cb47dc5b35c6a938b078d6603377181da94562ae542951a3f2566dd1c565488' +
        '2a076d0738e208a86d3385e139e741a126f3e3b59b7da737df6ac163b42fd4d60a819' +
        '45a146256194759884ef99170fd060319388025ee7c87d75c9ca8318d4a80f8d9212e' +
        'bfa858b4918287161f3c32c592766f83fa2794e184225968e9892c9bcf70119d4c3cb' +
        '1dbc1b8b554fe4d70bdf483d17223b2acf19f544fb724516c93e604bc9f2da90350b7' +
        'fbba32adfe78c9fa6b31af1102da48d0b30ceab09c8cb850a1d96ef648a8b6cac6334' +
        'c815ff1898a72dfff656f8d256113d8bda6af910ee5857c77234bb2209e3fe24b353c' +
        '06eae93fc01225c9aa4fe395bd9ab3b73dc8ad697717e9a4cd87167637e09ce1ec1c9' +
        'a4d764afe5835740b31fcbfc366c0bc31bf2ad53df16c812b5f243da47a19e0c23091' +
        'b5feeacc50c9f9694997d90d95d8d0d850df09704db04b9f1ab8343393893f46cea4a' +
        '82ce7a3368aa7e2de736ebf13a3fd6a8a73e7f984ac822cf13c615ee8320b10f88479' +
        '22dbe5dab0f2f25545616f06106068a0c45342f4ddbd86d3da3d9ab45b9122c05fd74' +
        '176a441dfdd10202a99e40ee67d06c452980cd9c24b2638fc07213211edb839a35cbf' +
        'e714358850ebf68fce3a0e8f2e9723460af3b11cf32d63e8b1958702c0eb63fcef9c4' +
        'e218eb88b4af2658469d4f655197e79b6bf9e5d1707db3381b280ebc2bfdfffcf11fb' +
        '6d5bced64cb5819a6dc189746ff7baa83d766917223cc32a3ac5f66f701b710c63282' +
        'fa21fd863ce3bb7aca3b6f1a0fac2add641fb519cbf6bde10aa52876d016f7ca4adc1' +
        '306f239b652164c9a63051cc27cc906f5e829ec8634192c72319caccffb58b5bb5692' +
        '39771e3b04685f189e0b948f882bd6e280bba96ea7fa5cdfe3b9706f5371e75937aef' +
        '7316f1e20e742f05b258991d5dd69f5f59514eb64880299bf2fa9cc2e4d49695d861f' +
        '5dbf87710cbc572721617da35212a6935bb10d5e80b9011cad6d2407c7fb5b6020fd6' +
        '15010cae3f409a301202944443deb2c22df40dd436e1d6ef8a4a5e2535adf74c47d4e' +
        '57c1cbb0d5f9e492ef03cba9501eb5a08f47be0fe65c0e83759c4569968fcc3a61226' +
        'f67fbd90d56606844e3f1cda1a2a1cf7c2f18bf4ce3097cb39a780c68fca5640b17e9' +
        '4ea61f55bcd594f46b9bf889472f962efafc02e8071db3a8d6cd328388f01bb95981c' +
        '3ec9c86dbad4e9fb2ee2cdbc44b48bcc96a50c5d3ca5cf922a792e223fe0a93582adb' +
        '026981c953f91f7c147434fd4feabe5fa3c0dc7c4767cbef845756eb7cd6030ba7c95' +
        '4e4423fc7e8ee88777755f6f645356d6d3929705bb973d938cb08dd0f16d8e8fda8c1' +
        '6496ea308e0dd3ce9f5b718f68d555d8f46e733e65f4800a2f5c531cb65b92e57dec6' +
        '2fe754f75261691e28e80af993e71bcbd9ba2667896462de0b053d057d5b545c98bcd' +
        'bd5a5e872b3a58c539d93b50e51973cc52e58d06b5f50eca057fca6ca1cdfc76bcc83' +
        '366aeebb0d8c59fc95d8f214ca1a2d7adc4bda43fed79b9a097e6ed553f0ff9f6126f' +
        'acadf26f3df9ad1178e4a2e0dc42e4677fd8b676f2f5ecbdc05268f61d66e1658bfba' +
        '5d785b69f7fca1d33aedebe20519d6ab1c443df1e8a7143e92de228bda0977a26dd2e' +
        '9efdfe8ceb61ee97ef24e7acf22b274a6aebbba0bbd2f8dae470fee408fd7dbea6c61' +
        '1ad68ae73d2efdf0b3b558da4e5781217ec5dc0193fd3df4827c2b29676723d7dae2e' +
        'b9072e842b770f49af55b9252209d7057a7d4215c1e9f87236d839854529e1a120cd6' +
        'a1dcdbe2c8bbd4adfa24987e58fa648b97077d1e3766f3ed585f30ee17fcacd1ca629' +
        '7a442325e528f3599d64ee28685825aa6c767f45abadb16ba40e1fb86b7403c35ceaa' +
        'e4dee4daf998ae1c37d5baba2913415f520733c9f37a6cca57e9370a947710e3865cc' +
        '7e5e5575fb8700bc38b8cbaac36b88199067194b95c16e856f843010001b4208e911f' +
        'cbd4cf295756aebb8e39bd29684d5a6eae34c1863c7a9b0ae03001804505f6132e7a0' +
        '387d08425967b8b50fce5830657096b1d1c90b273e893f6d9fd0e1060320000000000' +
        '0000016145ca0118a0cf5eaf1b6b219fa484a9babce8e76dab8908416b5ccb532daf2' +
        '68c76a73d50d16b2d8cf3f2a13e0d5e9e96733e1263b7dac0879afdc284b8af845fc2' +
        '01ce2ac53b9921d8830fb13e4156ec7eb7db3638704bc594d8f5a6a14f892623da42b' +
        '0a630d7bf50ba231f4aeda109feee405fd04c332bdba34fd77e4989e5505b24928d9c' +
        '7eb3ba838a66f44ff846f442d5cf3e7ed9fdf7711a99d0daa5b2af0c7f18fa11a6f6f' +
        '3e931e6ae61142fa7292581a075fb080f0339602c120a773435024da786c1c2cbbe64' +
        '11435a58ecb6b31e6de3210515bc0d3c0b903f0b2f939d135eba5913296ed823ab3c3' +
        'd2e774838cd27799b1f43fbccf9ff64db3214c910d691a356f1b959fa5ce07c6d5a75' +
        'd637c1a59d2233fea34a57004784d8557a9b653d2754bfbcc60ec34c227f49eb9b2db' +
        '68675089595d72796cb6280bd3ef52c7e19416c30288f54617d45fe037a86179b2202' +
        '13d3e4115e5ff6b031afef243d6bba40ea6e5d0c2e6c42b26f195fda6e1c67eef6794' +
        '608ee7ecbe26ea219b80d430e95e660ad35bb6feb72e99c851b71d9f101368b1de73b' +
        '59e424ca6bb74e5142262b2a38713d8154c64e5649c48bc842d9a9ed956026b7dcc0b' +
        '9b91304966b009080fff2fdd1d719c52b7792353eb2c23d062597fdd4d80d737b70de' +
        '94af9b88175dbe4c196e2a0565b419e5415857d3892f4353cf37de11e20204b9b99da' +
        'f570627208c17a546192f287b27ce19d66905a7040aa56fa529afc4de9f5b73f09fde' +
        '2f750b728435cef1cff3d4d409c5580105dc42638a86dca082fb765ca09456430c9c7' +
        '6fa2e2ad036713ddf6febca85516c190ea9ea86cded46d31876a990cfc289c83dd931' +
        '26540db778e82d70eb30d838b4bd15138db1627771d47cd72fc9b1d5f173c68c240d3' +
        'd93078b81e40e9b604581170db777c52af957c923dbe63f1a2dd2cb4b2154ce6eda4f' +
        '4799aa1d992301ffb6a7e12fa6d299e92d1fb3635b37c35c4caf9dd2e0fee314ea428' +
        '91eaffeef99866eb8a2098e51805f34d1d0f2db0a7bee452f0ccdfd9f269d3231db36' +
        '3e1b75336a7d8e658e6ee46881c380db88a71a7b3d365e7b1557bde479150d3b411b6' +
        'afd70a3e7ade9e161e59b6a87264870a5a4b5e68c6cebf00afb4413fc562406e328a0' +
        '163e0f39220a79b6d655b3e2a12cc26152ea8b96a4183a5b68c5fbadc6071fd4f232e' +
        'a7bae9199af7bb23044a83038037b8af8e43be708bd5278c68cdce7c0cdf8c8a3b497' +
        '48967009b3df43f04e3d946612957c9db49cf25d68933f7bda7c66dd820d1ed096717' +
        'b646d24190572c251f6f51b648aa10444a2f783f07a4b8ff226f20651cf32a5001046' +
        '69b3afa369a7b7bab77f4460961afa6cab57722372c91f909d5e214a625be4e53ecac' +
        'a3bc5ca1fabbd1b2b89306b5ce799e1e4513836cffbfc3d74621d7bd7e10c19fcac10' +
        'db93c6da69492d705db8429012de03d91c1ed47ce185cc1252679a2e55461381feb21' +
        'ca8be684f605aad3386acb3e2a3fa1672bfbeea80a0fe25ff98294779df2321fa8669' +
        '8871f57eefad2150129409bf054b0a626cc13f9a84e09766982490c7070f73deda4b1' +
        '586480065bb5b2cb53d84a25d127c26537c76c187e34d1bdc8fd37b5931d7b9a351d8' +
        '6d300ccceb901057f6314cbc7d5a0758d19255c73db773678f424cafd55f466d6220b' +
        '7439fc115264e5c6756f140f651419b770a342e387b6e95b991b79e4cac24a8a17dbd' +
        '15a5eaf60653d1d2d9ad5166d77338f6e404098e4872f94ce957c8d7dbcbbdaae42e4' +
        'c19c681a5a3cd90da9b9ea977ac6fe1f4d700dd432a438fcfe615d0d375b6f3587466' +
        '5a43a25f401a6789da2caa8b1124666f6168127b40ebb4a2d3da2d83872f275e41bf5' +
        '95fd7f56201a5d5190b8be46c5275f760f83e86c18088f0ecd6a36d14f772cfc5b9d0' +
        'a0c3a37d010a043c03e609ea835a9952591150fde713cc5802103787aa32b42f885c6' +
        'e33251d711d17ac5d35c3af708dbe5290671af435d1a51cc4c6e20cfa04833746cd53' +
        'dda6561dc4bb232d9789588036b870a5d482ed45a44051589c516a5b2c9f97807202a' +
        '817fc79b3029ac3ef82b062ea802269233ba47c9a131d3772f606076fddf1e7f23114' +
        '464655a28771a9bf3b95ce6ae4c63e7102d8ed9010b5f166fd1ffd7a52e3d69927bfb' +
        'd3bd5de9f6c1e0229b51d2c4358640313ccd7895b31aac41d4db2b07950fbcd84c55f' +
        '7251d03e012bc45d51f2641e2ef56554e232ca6bfbf3e882584f3203cbedf21392eeb' +
        '6bc2abdc43400838aac770e2a51bf13680828dd6f67bf98ef2edd07133d17912062c5' +
        '4a82b956d64ad37a18894d6732491d231a3763ccffcb82858e0b4be359ee0e5f7be78' +
        '282b346194020e3f351ec4a7b7a83d08af4a5f195b486c8c506fa8194313eaa1a795b' +
        '92bd972dba484cf782c88ca25b7e5a547a179d3020354d1b55bd6f0fdf0ae6b78fb24' +
        '403ab8677e6cf07c8281f55663f3dc26d95f9ec47d51b719b88f8f46350aa64b36b7a' +
        'd10f93483f34617a3ea1ec7377bc422b97352dd11b7590052801e1f8ec636ddcfcef9' +
        '99d35f0b94dd43a12dd558ce8617fdc496778c0fac27cd2c757263100638b542afd4d' +
        'd13e0802bd2880164bdf4fd0a3f87e3a7b3442f59a6bd28e6631b8d0873085bd4d06d' +
        '51fbbc934c357d8b737b08beae4d18c43a57bda8ba0f02ff30930a8559095fd70a3fb' +
        '6230d6c865cc4b6ed7852e87d2c4c736853a23da484ca78b97f3ece0ac0d953456b91' +
        'b6510b7328b32fc2aea36103ce8f1962db61598ec75195ecc1b17e1aba217807d6845' +
        'e92d0552438408b3c401d8957a633d6805590b4b04f4b5ed86469ffd907a92d4e18d8' +
        'da07100da45c8a0122450d709a5af08f9f9348574dd18abf2bb95edfee67fbf01564e' +
        '6004221235f779073caeffe4e3e8e34f05bc80a7e9fad410c2cf55bf2fb986a15afb5' +
        'edff5f43f9d4d252f3488f7bee7aa0aafbb7e77072fa2a6f00c56baa9851ec4187e75' +
        '959b9f62aeb8a6283fe0802e33d17e65057c743f0ef5e6371110ebd32ec86c40f2699' +
        '121299dfa6eb9a22e4c3eebfba94e50dedf2955018f59991ad6b8a109e56369b2a078' +
        '2cd9e609ad5d22b9858706eac690d72c6699e65a09e444eac820830495183d77b9acf' +
        '801516f83d46bb9e48cc1d38f415720f1e61ff423649b87be94ff9ee39cfb27e38ac0' +
        '1ae3de23de434d97cf2668444b0a894091324035c359918d25017c97c24c0d097f72e' +
        '4ca6d8f49ec3af125bb531c5a16b1ae713ca03e2b7b2610edebb236d8e6e36478ef8c' +
        'b3b731388a25f0c0eeb0b478defa0a87147111809fcf1bd917e9aa01aa9d443c3f859' +
        'b70e7e56d4ac5401c7cd25ea8ba341f548c4d54f79873d02704ab8ec26ddca079d35d' +
        '5aefe4351cf1bc25c30a49712795dca62b4948ad13ccf21ce6b7ea97c17d1ebc37851' +
        'd387542dd9cf6e9ce5dcf41d6c7444f22746da527092496afe132dc5373ec678a4e5d' +
        'ace9eaa292dfddc596f6dfd5df6ab23a8620ff3086f308de84340d94b6dd81dffd00d' +
        'b8bf8e01e52943f4fef50a55d3c68cf0e841a9ba24f24b2324152d24d71baa0e6c6fb' +
        '5cee4c195459f31d666bb85e5c805cbcc3e5ebb2b77a52284d846c776bd3615069aaa' +
        'f8993b6faa98a8c5c68849b12ea2310f7dabf1ca08108c1f24afaa2841a7774cf316c' +
        'bfb722f28145459f33531ee289f7cb9402130b1b705f2d5141ed7fd8aede50204929a' +
        'a2a1e75c27c77659dbd9791b931170c308e3f1097587432cb53260e408e2dcdfdf28e' +
        '9d781a2622dabee7965b9916957e8aa072df8508802bf414efa4143a1fec0253cf340' +
        '9a652c1ce6b14f5f8c71bbe322674920decc1150888b3123403b1074a648fd912544c' +
        '59237126845639e71ab1daf3a458b2bb37f2cf0973016fc9318915e9d9b7f8db32298' +
        'c30c2e1a961bb1c3dbd816aee609f746a10b555b5dcdd90b459ca5e633ee178186072' +
        '3e7ab985b57e6424b2f3a678f2546391164e1c5c8866c53c67a5930b5a57faab9d5ea' +
        '54c8ec20831f31c875785f1a0e9c86692b912d0d28fdb153fe715f3602431ae014148' +
        '1d3bfe8e66e0fcfe57799e1b8e669fc71a85e45d9918c8175144d46e8798d07f92915' +
        '3fceff1dd580cdd5b20ae69c90e12d0cdf6ae98a68e95f798112a8978e899d3f47331' +
        'a2b29f61d1bc2a3991b20b390635322bb0f10a68374897597f5f573f7d11d0e7c9cbb' +
        '3d3ee1554ad071b24067d2141cceabad8dcb45ef02c0cecbf5a08043def96b93fd328' +
        'c6bb69e0cff54453a21f81afe2a2ece8036d8e3afcdb3ac630e6cce252baafca14d2d' +
        'b5f0c93a28ea5700aa7c3da9fb5195e84a141f26b19b07c33d5da16d1c761ff282895' +
        '6107a62582f4654f2f79c3c88639d9134f4a641d9ea5e8f9500c3ccb2ab434c245dce' +
        'b54bcd22637787845df11cdeb15ca67c6d62b5ffc2ed656c9428c7e313455a45b982f' +
        '4b9daaaff4c2f7bad9ef50fec0c9f14b8fe92c7edc039aa7974317e25da3de5211756' +
        '133177661681cd0c6863fb47b3c2dfa0550f0f6042e7534500c21b39fd5d778f59f0f' +
        '422b30c861e88f4202a0192f43734715216c5edb431e1a13cb9c32fe142b6d046ce20' +
        'e0a5b026672a2f2d42ff58f2ec09ad1bdb6fac5aab0bcfec193c86ebb84f7bdfe649c' +
        '52ef6df05474546dc175f00aef053e96cf4770c3b2ff97f10ef1893e2e852d0be39f5' +
        'e476241c13ef254cf0e4289d1592d25411af783554f7b95d4bb4a81da842fecbc5e1e' +
        'ad5c40bd8b982abefe19b96616f647dceb2e6bb08573b030defbc348a4195a0248f2a' +
        '78260a4e275c5ea85faf1e97d12a1d486ff64adf2b572240242c9bf1fe0593e748035' +
        '997ef610367d56aedf82e240357b9d496bd5222a28b456d9ea518429907cee2fa8b70' +
        'ae3bd7265bbe5f4e471f40702fd457820ce530bd59c7d09248cedfe62d27143b305c1' +
        'ee5a5badb8b576c48f7ff88a11ce5108b6ef4c2c9cb997a24a9a5237845577bcc8e76' +
        'fd04892a0d5744bf88e8eb20e334b8a0e4916bf4cd03c54050da3a7415d24363d1071' +
        'bf140fee666caf3b7e0d8e768643fa4c970a75a888d459edae265d5af08e6506ac215' +
        '72aa1308e6498b19ea89bf8b18de2d2eaf2073705f98fcda5647e9253dc7e6733ba84' +
        'da21e75a9852737c49d24fb321ae7e4b5669e12e70c64f4ca182494ae518d990dc622' +
        '133ca16fd9627b267adaf8e6f2c5c56d36efeaf502146e3c33fafe55f54fd40194c4e' +
        '8b95c7aa26ab24c3bf3da6c5f456cc5bb56d83a686ae57d388b3bd4679731a87e3a7f' +
        'fa6ea1c7e6e738dccc898a14181c5b46cb48ccd587f9f4f749bbd85f7f45c1fd0e4f8' +
        'c438a39631444ea3d6822282fa70a0d9cd6bfd455890bdf6f5b1676d646f7c717a156' +
        '46cd1cc3ec4217bfb528b7a584779b1114f0baed61f7d02d8de3b3d0672bc146afcb2' +
        '9871286b7d98bce0de2482c7294aa337cb7289c696784821747aa0359cb81df7644d0' +
        '25f8e02f2a6f0973c4992691806588a43702f2d01fbe1384927c9224b90e1b22da727' +
        'c5475d8b5858098a242f186d14f4aa65daaff8ef9b9b38ffb428dfc9163ae29826fd9' +
        '6d49d116f5129706857e36969431f004455846aee64b95ca84ecc37d327886bdcdf03' +
        '078b11f7fd6376ef3b850b67813b7b0064273c5990226821a8950b485081bd9ff8500' +
        '6191e2d46545fdc8f72217bc6972f0dd3c2eac44c03e24447b86f5e79e1afaaf67ab3' +
        '0932f9eaf07f4888209b153c039e5866274d0e6a2a0b1a00336f04414ae44d380000',
      'hex',
    ),
  },
  unconfidentialSwap: {
    aliceInput: {
      hash: 'f3f273c0216f4a16539844835d0f73806d5afb9638b36bbe4f0a75405d7d2207',
      index: 0,
      witnessUtxo: {
        nonce: Buffer.alloc(1, 0),
        value: Buffer.from('010000000005f5e100', 'hex'),
        script: Buffer.from(
          '0014659bedb5d3d3c7ab12d7f85323c3a1b6c060efbe',
          'hex',
        ),
        asset: Buffer.concat([
          Buffer.alloc(1, 0),
          Buffer.from(
            '5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225',
            'hex',
          ).reverse(),
        ]),
      },
    },
    bobInput: {
      hash: '52306af6c94424f2f6ebef71d7a8e2d70185946cdf03bbeba7a1961683f3556e',
      index: 0,
      witnessUtxo: {
        nonce: Buffer.alloc(1, 0),
        value: Buffer.from('0100000002540be400', 'hex'),
        script: Buffer.from(
          '00144620ba1a4dfc1b7b8503b37e9ebeacf675722afa',
          'hex',
        ),
        asset: Buffer.concat([
          Buffer.alloc(1, 0),
          Buffer.from(
            '2dcf5a8834645654911964ec3602426fd3b9b4017554d3f9c19403e7fc1411d3',
            'hex',
          ).reverse(),
        ]),
      },
    },
  },
  confidentialSwap: {
    bobUnconfidentialAsset:
      'ab4aaa38a7b0ccc89a910d7d4a4a1475c919e3664064a501cd16d3203e74abe1',
    aliceBlindingPrivkey: Buffer.from(
      '6be45323f72655d445bfc67c14da5a31e0bcd8da8f5740bf69d0aef84827c06e',
      'hex',
    ),
    bobBlindingPrivkey: Buffer.from(
      '24751b800dba58c405100df0d2a2cba94ed4cdc17cf922e3893cfd77f2a2e0d7',
      'hex',
    ),
    aliceInput: {
      hash: '2af78eaf6b52bb8c79b07111b0d80e848dc5e1f2baf8ebd7ae74d556f4f4e383',
      index: 1,
      witnessUtxo: {
        nonce: Buffer.from(
          '03b5f6c20dced1c018fc1308000dddc3e92315ea5e0563566556bf33fb846882fc',
          'hex',
        ),
        value: Buffer.from(
          '091ac49eaa28925f25005565517fcac5d235b41b82ce39bf1bc22cb980312d6215',
          'hex',
        ),
        script: Buffer.from(
          '0014659bedb5d3d3c7ab12d7f85323c3a1b6c060efbe',
          'hex',
        ),
        asset: Buffer.from(
          '0a6872b130ac4731636fee13ff207d3d03d12421d6410a3f80863bf816af84f969',
          'hex',
        ),
        rangeProof: Buffer.from(
          '60230000000000000001356c00334d5922df15a9bf5692bd3e0cbb76695ae0c8601a034b333d9c2267df0cbf0bbe6e2378e807687c07644c2c88a750a9a1f559187989b9e1d7af984f8812d64c31f2fdcc5cc8ea16cdb1059bceaa61350ce8c2430dbee88bfd2b393b680d541933f2ca950810575922ed5b83d9a34d551b62152624eac1a4488721dfdf6f017c73c7df17faaea492ca649e067bdea5310e1a07b680dfed6a3f28043bdb476c363514db5a14d95e73ed3e39a6f5e39d6c02ca1ff3fef44ab9a19bb062c12abb654a0e176e44ef02db42c5ab3f3aea013d6af2c7fd8b978b6636ca2f7eaaab4ef6da7cfcc72e2d33e61d02ac44054d8c17cf010ccf36005187dbfb66b2e42264e5faa04f3dc820b69a2f6669ec4462027d37a9285692d1ebf82ef995a8850dbe7713a492fe0e70f4fd44932d10a53a91fdc086378a73a0ec66fef06c1bc0e66146729c567e1cf4074f46700865c510d4656720a50d5f825bb9cafcc53537095469672ad6379cbc752e1576fecf5e9ea371e156d9cdd4be9045a9c8e6a6bf5a3e7741a3f630b044ca93a56599c48a7c91bf36e7590f7ea6f10a56a76a29e7001b38c47dee98037caa628ececfbc666797312ae1b2ce85c923ba5f177cf663974998f1de1638eefbd1a27e437ace6d34b6b098991a06df1a2025a360060c13455235845638f24b31dacea2225dfd9097550dadbeafee49920b521bcdd70912ca96d937efacb2a809c521278d08ddb8e67dade9ab7329836fb6ff2b0a5d3e1cf81072eb4341a13df17b03b78f442e90c22c7533335b78bd0811901b77fbb9544ed22bf8ebf5771e2195ceb3156968afc97287bf9e6880060433a7b30fa74420dbb275daed63cc3e3db032bba98fe50b3b8a88a369c217e3c4ba2803b8a8513bb293728421bcdc1b70fb6b6ca1318abf30bac8f006817502e1be10997acf6c383b94e88e16250ed756d9200466126186336bbf21212a9b73f42509cb49caca28f77f4506fef406d119733ae6141c70f8e75e7c72b352fb33be75fe6fc2297d6ab7ddd43cbb8373736d69674cf0573b8bd278807bd08bc2a0183ccd21203df1df2e926af047bec5eb12f150f11c51174d18e55c13f366defbb53538406574d9bf467fb42610c3e7d2e9e30f79105e16d928a607bc108466d2314e122531455f69a7ba8114785cc7ab8297195b0b7560d08b8f48753da6375dda8724d8ef641379d0e78660a0609ffba62f7971b6d79386e2fc9fc32609c4c80e9cd7315ea3a5653a94058fee2b4f61b83f23b8ed405d2d32f35313b0c79744606a26eefc67ffce6740eec899e93f68b491521353cb1e7eeb43b2e4f118b4518760e65d126d560fc468254a51733ae3d8a6ca0a62a569b02a5f62eadecd1a0295a5fd8f4c83be5a1bec366260781f6a5301a2413933e7a80219ee47bf26c5936b22b9fa7a2af425b012b0bedf26a5ee17eb92b63c269177d281e2e4c2c2d0e13430b80f6782822c6ff807bf3e1d15a8df9c92b5a3cfb64d64bcda453903b7f7ac8d3438f44237b773e73abea1587de46648ee9c825ecce7052cd5a6e0e9094a2507472b46a8f4bd6c6b267f21ba7cf3d6286b48995f8290811d7678913c9c904b58ff2324749739a7e335853cea34034e114f02f831524e0a9a60f11f9c6f64be64b79950ae19e42526608359a27a97ff9d4357e0ff28ecede17bfba889bd30ba3048c1ec24c7cee14db766ac1a3a85caeb206be105ffb4d70d99c80ffc0ec7198eb98da49fc69dc0ddfb797998b4de180954afe21febc0cc3f348f5f012e7469ad4b322920a3834abbc3d25944c5309c6ee56d1428e93c666bdfcfd876880bdb6b79a459822215476e4ff633be0ca651578f99d7afda4703b22ff61316ec234914a60de3277fe9aac71b810ffcab465731af1bcdc26c2176ef3e43cc2d805f5865c2ad84d828af38ebfc67c1431e6c7799f3282d0d371f390f7d42f103e9ac678805650511354f7a6a6d2e6690ad7120e8bf9e5bebe3c75f30dd9145930b49a8d28a10cbac7f7fa845cf10e063498f2397b3c9123dd6269d062b4caa6c4e09c8ef80367849db9379071b715fdaf18bedc8cb4e25ea6b1cf0e72c31f13882a57f642b1bf707663dcd02438e00331094f6ee61a235ce3a90e833d8b2e61703740a1d603a0e7b3b590308d75a999ae586ec915380619829b1cc4723a719f55a54cf32ef374ebba9614936738fd3f29e0f94e34ad78fa1fc049e2c62c66ee42be7d970121771cfe14aece4b0b393980c50dfe295829ed10b38e81e0c96612b840e0bced0b8d6928dc719391760bbe6878d47f82d436384a93db3a8bf608022bf0ee47e01e55ca1157a7c3d073da224468bacfc24f393021ba7c4da985d7aeedafa90fb99d3eb471f166242e08e82717cbb2f00f16831b396ed5587787279b92032472b9f6e2d13f9bda4504473bac5fdd4856fa9052758e3ce4a4513f3ee2d077bf1090d242e328ce1c6f43aac7bd9abaa75f864498d8adb249bc746b9dd54413e45f770c35f1ddab81064f3717e75ef1d1a53d05e08e3233dcb6c35c39629f4c06f47df636337fe8c1a9db89073680a2e6f2b1a55840ddfe5ce8eda1adaeef16638eadef64ee6cbc547d762e5fc118c458b65b65b0dfeda9416e657b6a0d3d52d662745f67570a5c20d16ae5b961c431215d38ac087c155169d8fa55fc66d552c4eca5a3139d2898c71df415f83a3c3204802c6a06a44d201ba8d363073c9ffa3367b2b8ece6764c39dbf99d064b92c05d97e719e252b8d4b8a42e50389ed1eb5557c2d18ed48a54bd7dfc7ffc93aa772da4264a0c415937a7060bed80bde67273e7bf66f2300adb367b1404f6d3cdffa7ccb81badd4c8133cf4d7d8c5af3d6365cabfea2a0a87e99825325a98cb865ded940939b319ad0a53fb00934ad50f3a49b36d158b789bdae5b3f876a9e86efa6bb4b323490550a0dd0c8b5b29326c2f2b32f7dbc79031f3aad4c4e9f11dcb6b0f6b5786dbbf091fdfb4a23a3867d39d82a3a878a0d337a9eae5b41be72e93e3ba42a58419900eca4e6f61cdfd161fb565147c6b2d2831291701f20cee6c23bffdd838e8ad337151d4ae0d2ddb9a12239ef4e534397ee624fc2b7ea1bd76cb52b30aa79e825b007eb775b415fb554966b48089d66aa08baf71c1ebffe4bc62c6048bcc3c762a84edf4788e70935e6095bdf0704ac0fd23f46126159a5e12cef1d0c09e4a8cf9412cf86c14b0e6b95b00dbb0c53e3b4b3da3185810c4041fc27dac9c10a50346944599ebdd82feb6039ff25bb5bd31ea05bdfd994ea14cb13dd6f17fba1f783d153b699855d52f3ae729bc715c86c46e5460bb20ee42fe3cc5d7de7fa5ff658e71aaad9ec40c97fbba9e6751c17e3d1cb18b4a2edb21fc07c896cb336b846c9b8fc3f6185cdb265d8f245b265fb5adbdb11ca740197bb526b505df10ceaf64644891d0251782e2178474837a23d90edf42755ed1b6b8fa96383e46388c585695ca63e0992c877adf5ac0db8e554a17b6ff71b97124e5dd5238f749c171ed395be31c45caefd552f8933a65b027a7c3226d33fb2c650f49dd4e3789a15b25ff045f3a402fa9609e6f92cd2dbc8e912833b56593e971bfa2e26d00fbb2b9f655fa90c47bdb98685abc843227a890f9a9c862bf8a00e7d5f584377060da562265a9181328e4bc699fb74e3b678a977185ba4ec098d89ef81b12a31e006729a48bcc9620f58b5f6ee95b970de1b016faadedf521474ecdfe5ab1b2da68c0821029d8bb2a636e54802414b9596f9777b6c01a90a09491f44859bba826cc14b8f3e37b15c4a1da964514df01bd7a285812cbb54b2277c068aaa3213b35413b14cbf0c16ef0ecf0ea2050f7965e67aa636f2eb2faf2b5509fc890a0e7832a03134a02ffc49b0602a8e0513fa70b1ee633325d7011dc2b28f00b075c743c5896f2eaa7697e06d43d16e4feb3b195691f5bcf7f0b68f0f9b0cb63fb9b2dcdb7cb30c052c8bb531f9f2f823adeea405fa78e11e117f73ae214a186ca28513b2df5c9874660a50405509d70ba2a9ae8d39cf6b57a8a3e9b2dc8ea3',
          'hex',
        ),
        surjectionProof: Buffer.from(
          '01000109864a18257dcf9b55cb640100718ae0405ad2ee7d0ffade89713f0cd05b7586b1686e52a59ec892ad4bc3ca496775285153f5ec070ba1c2ee5f878d0b79a53e',
          'hex',
        ),
      },
    },
    bobInput: {
      hash: '8842cb710ee2d11811b7a273b410db62c0a632dbbcd591415f41c7035aa314c9',
      index: 1,
      witnessUtxo: {
        nonce: Buffer.from(
          '02916b7625ca43b32700a4410025458a3e466545a2bf82ff4e773a898ab7a771d0',
          'hex',
        ),
        value: Buffer.from(
          '0804c0f36033a42761fd7adddd50b043424e2b4e3afd272311f8a6ad6c1f70a3e1',
          'hex',
        ),
        script: Buffer.from(
          '00144620ba1a4dfc1b7b8503b37e9ebeacf675722afa',
          'hex',
        ),
        asset: Buffer.from(
          '0ace9d9f1cd6777fc3dcc43a579d69d99965705dbe31e0aa19c7c0059f7f022212',
          'hex',
        ),
        rangeProof: Buffer.from(
          '602300000000000000016f09000e341206c1088134eb3d888603f87972ed5805bd9828ee383e23ea32f97e0a68233fa6f1e65a8016504ea9ccc1b23c8f0f05dcc60a53f0b95637a56a8639c1e69334ac91bcbc3036c3eaaaef3a8e8bc1140fa023f8265e11d36e02279d58fed91b6f078c1a72bb2b1d587203928a61f649e115e7420b0da3ec50bc568ede349cac8530552974ab45825033c33949100f59cb4e63b6baa0a81855811a51abf66022aaa015b385892d2552786262bd4289f5e228c9efcc3294229fc65a6d42c579498bd66dec80027eb4eb2f2b27893686acc5d189d4c342005d9d18ce773c89d8d85bb33e1e8d289367bf9eb8de845e68913f09515df6d981446b8ba0c395fa9aab2cbea2f5928ffe3dbea997eb70bd4febddd22f1efb5ab8951f175acf0f35bbcbc907bd4b19229db82c0dd2f9fd3a58ef7e19c09211c331b0698c8fd287142d3799c3981a03d8fd2316231cbcfc11d100f427bc2b9861ed81f69d72005aca8eaddf6fcfec75c71054b51a9d0b9faa5d14bb2abe335996126e1c280b99f9a7b5de73bdae9af998a28b859566bdfc6c51d8c66c99543ff3c3afa3225a46b8f3a8c4f4d844e44c9c247bf5e2374fab06447ab48f77c83aa61e97194db2fbbf7bbf7d1b6c33c120b4f4eaa80b9074dcc252b8fe6971375fc6b6d185f3421413350ab5e12bc1ec5fe714aba54889b8681294d9ef10bc3e1192ee4dcf168a6cb0b85329d7ca7856eb8e939bcb185d74048906a720adc4dd96e80093a2b04a123cce2090d72edebe3a71ae09db7f2742e7e0a2914c1a3e60c75546f35fd749b8f94a9e12b5882b862e4d383efe663b7e6f37b7064e16ff847687246675341c3cc334149fc08b6138448cc1fc5d3073a1a226e055f17719a5a3c1ee0e0fdd1f728291db6717641872f138fda520a2eab3615055bcd038df09bf6d74f86a3248a1af59e367a25ac349a237154c82a5a7010dadde031251a37904ee72af7446a7fafab5b3db5c3c2b278b3c39a834e42a50abb21176e57ca2fbed61a0b0ac50fa69db29d643adcd9a54c7ce107d867d163730eb8b8a08c7bdf55bc6fb8dbab33e1b43ae10559234ad27068a544d0669588c1c81786f4466f5611da79dedd6fc20d73c1f2eee0ae418098d00c8664faf2dbbc7baf639f1d7a0930744d180f3d79310db4d349ffec0ccab70910354c41f8b4a4d033e843c05f97db421fef448d273b3b782b25557aefb2ad8039601062d7a3a1409ee978edc8bd5b76f20de52114cd6ed9a010865d876ed8ee066d8936194a0c9858950901b390163807ee00bba68574268d280d2a522fcd9db41bb01e2217be76a1d2a0757a326c7b6d2e2cf0150a1f10899ba87fae98139433611ba543913f70da59f3cd98bd798597b32f3c694f43c7e9520072dc62c47444d1c718f0a12ce286d450f0f0b9d9718621fc9490c53992b427229b6e63dcf432587f0dc7e9ce7f8342a82770617c353db2e110a510e44a771155519cf2ed83ea343989291ed4d4d21f4cfa700499774875d7fa266ec2c2ec1fbcbdc4d1e4c407c25e211e30fdc91005dff41257c7dd053492499108e3b9d5dddfbe1c96bbc79f7a8ee16e9d052cb468404a2a336af2ab1b652050ef8608e1aaa972f5c377bdada5be5eeded1c070329d63584f31977a14ccac6358bd5006b89acb9c1963154b07efc622eea27877dd800c6926d0499ebd0495d547395fecac48bdfc0ed878bac65247316e6a37c69204f5d0633ade7f50d8efa09659450ef0458094a6e1e400d67ef3cb1757237e5829b13fba0071d2b4cfd9ccf411f25054bf7bee1851a927c7c5cc642474cb542e19b371cdf21f912c669da6cec5469c634af07f8f1c38f0ed29cfce2d1af365466161f8c334a65a3f46188b39ff24356fed0b9898faa34145a5149a0156050a4fbe5a784a721a6646e270072167e72bf509a1ec09e15d25201814f7028a20d655fbf4fef7d6566888ee9eabba335b9f34a637ad87efad9346acd3ab472d2f4160e3fc7222747a3d8ab1a56b601605aca0a3f5b344a9e80c4c6709b29bc2142635353da017d942083cf644b62c9c5350c618067881893225f05a0ea6855479844979f6f9957f9ecd30ac6f37629cfe66c83190c95ea1de6b9b58fb6672d9f493e7253632d7c4c66f1016bd832973b6850faa275e5e42553743250b8e7c2eaf0858ea379d056092dc56c3a9d13aeba285c2c80bb042886acafaf80c432ea90d09eb14671918b29adaf790aefbb42310e1d0b9f57fd16d0f9127dc89b99f92398e091574f175c368f6b6de94b352af8716900a0c5abc16597c3700072c459f7b642f911cd61d320eb39651d8e3b26bd0482481b78bff60ca3926d3f02369f5c2caef60b72bb6b7c181bfc31f502c679944ff01f6d61fd5ef727440dfc211d8658acc365ea62583343ae5bff65d732d0afc4ed0b6209653561bba5b9904ade53f51a98cc969429799eb9ec576d66766abfc25b267a26e7ebcb9f8b2a248effa8c3322d2a774a1e40827e603d802556f676b2ea1bc635e1012fb9458b75666c6b5fba6709d285db6f0754406e544bcfa6f4edadbd8d32564ab2d4a860baf1724bf828c2f7f2382ae09d92df7f1dae3db6e1acfa457627af8bad27e6ccfe4581ab588d58587f62757c7c6e6e6983f9f8d7669716c6dfae5a94e550bdc7f23948207e0b4ac8f083efbfad13cbac9291057a1169ed69eee4b5400214cb831bc37c43359dbca4ac10ddef72c751796c422014eece13551992fe0fea06d02e1c2c36ba3d05359faf2ac8e0c382236ed085a34e406f9f59c76dd208a856c4d5951c38e4b285ccf07e5c319ce538412520359745f08f9d9e1acee7062346898a8a352dbfee0fdc818cb6547dcb0edc6e5c451aa29217b8e818474f54b953aff963974f85a485ae46356f29186bfbb05224345442ebe1bcaa472637a4f6c8b42ab1c7da5e064013d08d67e1020ecefd1c2e6fde0ebf5b08263d47901419a4096882bfbed51aa692e651931d71a71e2d3b11593afa64dd1e51bfec3e38ba6c52578a43c11908e8882097c321852a23bed9d9b8198bf0659c65e65066fa6a69cb88f9030fc26f87e1416467cc55232ef1eb5efd3efb3c99a6927c1adb8cbcd2cbf7447ac693584924e81bf857d5689ce7e73c5804ae672839113df91b2958b4ad3d1f107f9f3d9ba8d441a1fa7eaa01e3521a2736c5dbe6fa35a1319cf8e602a90602290120bb0538d9af01259644eee635fc486de848301fe775969132a2e1ad410e58add6e1d1da689df5b559b216b6fe4cead8c5fc00776d3ba53f621ad0a7a23bc5b71f811c3cec18eec053a0082b3096c52e789ec18da543cf2e2084d67af6dfe0cd6ede3bf682d262ded675e125bf35580a0b5da46c5fb79935d94a6c64af5b2f6f64c69944971248167c85327923fe0dac884d136ee20289441fa3eacedf7544d03788b2a578e59e090bac9687b7ad5c4ac8745a085effb0a21843c87975dca17e44ee8f64c7b86248dd3d82565403c1867c703629f871be89c6155581eee74d635b3e0e156018a1e56f632ebc20895438b9170d85000bc9dc3b8174b34f3b9da7b4ab0be19107ab3680667547ff8c5eb552cfcc8591eb4914cf8eee92e3dd9dbaaf2d94de356b9df01b9deca726b8ab2761c67c16aeddd337e9b5025fbbff88fd2bad670bc4f7d2d297952d9a67a22d85ca9df8f97b085ec0b981688903f3eccbcf255b72f2f247c5117d258928b62f2c628f31817c50d407aa173f14b44075bf93cbeb39a826d6d199004673f3e9e951a6874b53bf0bd69df289fabbe51235a6f4b4a4a8c7a50a77d718fdbe260387f17ba00b765649c347a4fb7e1adadc2323ae3a283334e8463b29c1dcedd9f7917d524b5c784c476eddf339f86b974d04174b933f31b0968f9b19a4fd2e288a3867a123838e0aaf952cc5f9bccd4e207bff95f3b88696bf6dfcbf9f8b851ca1dacbfabbf3f4e993398a0bda68c952daca869c02de27bd1cb27713aa5e92926b106231e270a1314bd43f28ba047b367bf94a8439905f3ea45956d6afa10c6930a3100cc8e3a',
          'hex',
        ),
        surjectionProof: Buffer.from(
          '0200030782e1ab89609686463e94e6ed44352c02c1990caa768b3067a10c5a9361e25e24c1c3e34563de9b7d62f73f6e45854eff7a7752705afd9bcbe767973e30337f5305bd8d06995a5b39a5ad194a82d1cdf512030ace525031a5feaab5f6901153',
          'hex',
        ),
      },
    },
  },
};

}).call(this,require("buffer").Buffer)
},{"buffer":2}]},{},[4])(4)
});
