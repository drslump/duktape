/*
 *  Basic Symbol behavior.
 */

if (typeof print === 'undefined') {
    print = function (x) {
        console.log(Array.prototype.join.call(arguments, ' '));
    };
}

function restoreSymbolCoercionMethods(old) {
    Symbol.prototype.toString = old.oldToString;
    Symbol.prototype.valueOf = old.oldValueOf;
    Symbol.prototype[Symbol.for('Symbol.toPrimitive')] = old.oldToPrimitive;

    if (Symbol.prototype.toString !== old.oldToString) {
        throw new Error('failed to restore .toString');
    }
    if (Symbol.prototype.valueOf !== old.oldValueOf) {
        throw new Error('failed to restore .valueOf');
    }
    if (Symbol.prototype[Symbol.for('Symbol.toPrimitive')] !== old.oldToPrimitive) {
        throw new Error('failed to restore @@toPrimitive');
    }
}

function setupLoggingSymbolCoercionMethods() {
    var oldToString = Symbol.prototype.toString;
    var oldValueOf = Symbol.prototype.valueOf;
    var oldToPrimitive = Symbol.prototype[Symbol.for('Symbol.toPrimitive')];

    Symbol.prototype.toString = function replacementToString() {
        print('replacement toString called:', String(this));
        return oldToString.call(this);
    };
    Symbol.prototype.valueOf = function replacementValueOf() {
        print('replacement valueOf called:', String(this));
        return oldValueOf.call(this);
    };
    Symbol.prototype[Symbol.for('Symbol.toPrimitive')] = function replacementToPrimitive() {
        print('replacement @@toPrimitive called:', String(this));
        return oldValueOf.call(this);
    };

    if (Symbol.prototype.toString === oldToString) {
        throw new Error('failed to replace .toString');
    }
    if (Symbol.prototype.valueOf === oldValueOf) {
        throw new Error('failed to replace .valueOf');
    }
    if (Symbol.prototype[Symbol.for('Symbol.toPrimitive')] === oldToPrimitive) {
        throw new Error('failed to replace @@toPrimitive');
    }

    return {
        oldToString: oldToString,
        oldValueOf: oldValueOf,
        oldToPrimitive: oldToPrimitive
    };
}

/*===
symbol creation
TypeError
TypeError
Symbol()
Symbol()
Symbol()
Symbol()
false false
Symbol(123)
Symbol(123)
Symbol(123)
Symbol(123)
false false
Symbol(123)
Symbol(123)
Symbol(123)
Symbol(123)
false false
false false
true true
Symbol(123)
Symbol(true)
Symbol()
Symbol()
Symbol(null)
Symbol([object ArrayBuffer])
Symbol(undefined)
Symbol(undefined)
Symbol(null)
Symbol([object ArrayBuffer])
===*/

function symbolCreationTest() {
    var s, s1, s2, s3;

    // Constructing as 'new' is a TypeError.
    try {
        s = new Symbol();
    } catch (e) {
        print(e.name);
    }
    try {
        s = new Symbol('123');
    } catch (e) {
        print(e.name);
    }

    // Creating an anonymous symbol.
    s1 = Symbol();
    s2 = Symbol();
    print(String(s1));
    print(s1.toString());
    print(String(s2));
    print(s2.toString());
    print(s1 == s2, s1 === s2);  // never equal

    // Creating a symbol with a description.
    s1 = Symbol('123');
    s2 = Symbol('123');
    print(String(s1));
    print(s1.toString());
    print(String(s2));
    print(s2.toString());
    print(s1 == s2, s1 === s2);  // never equal

    // Creating a global symbol.
    s1 = Symbol('123');
    s2 = Symbol.for('123');
    s3 = Symbol.for('123');
    print(String(s1));
    print(s1.toString());
    print(String(s2));
    print(s2.toString());
    print(s1 == s2, s1 === s2);  // never equal
    print(s1 == s3, s1 === s3);  // never equal
    print(s2 == s3, s2 === s3);  // equal

    // Symbol() argument is string coerced.
    s1 = Symbol(123);
    s2 = Symbol(true);
    print(String(s1));
    print(String(s2));

    // Missing argument and undefined are treated specially and create a
    // a Symbol with internal "description" set to undefined.  This is
    // technically different from a Symbol with an empty string as its
    // internal description, but the difference doesn't seem to be
    // externally visible.  Other argument types are string coerced (even
    // when it makes little sense).
    s1 = Symbol();
    s2 = Symbol(void 0);
    print(String(s1));
    print(String(s2));
    s1 = Symbol(null);
    print(String(s1));
    s1 = Symbol(new ArrayBuffer(9));
    print(String(s1));

    // Symbol.for coerces an undefined argument to 'undefined' rather than
    // empty string.
    s1 = Symbol.for();
    s2 = Symbol.for(void 0);
    print(String(s1));
    print(String(s2));
    s1 = Symbol.for(null);
    print(String(s1));
    s1 = Symbol.for(new ArrayBuffer(9));
    print(String(s1));
}

try {
    print('symbol creation');
    symbolCreationTest();
} catch (e) {
    print(e.stack || e);
}

/*===
symbol coercion
true false
[object Symbol]
[object Symbol]
true false
true true
true true
TypeError
TypeError
Symbol(Symbol(foo))
Symbol(123)
TypeError
Symbol(noSideEffects)
true
true
true
TypeError
val
undefined
Symbol(foo)
Symbol(foo)
Symbol(foo)
Symbol(foo)
true false
false false
false false
TypeError
TypeError
===*/

function symbolCoercionTest() {
    var s1, s2, s3, o1, o2, o3;
    var t;
    var obj;

    // Object coercion creates a wrapped Symbol which non-strict equals
    // the plain symbol.  Double Object coercion is idempotent (of course).
    s1 = Symbol('123');
    o1 = Object(s1);
    print(s1 == o1, s1 === o1);
    print(Object.prototype.toString.call(o1));  // [object Symbol]
    o2 = Object(o1);
    print(Object.prototype.toString.call(o2));
    print(s1 == o2, s1 === o2);
    print(o1 == o1, o1 === o1);
    print(o1 == o2, o1 === o2);

    // ToString coercion is a TypeError.  We need an internal operation that
    // invokes the conceptual ToString() operation directly.  Note that in ES6
    // String(x) doesn't do that: it has specific support for (plain) Symbols.
    // Use parseFloat() here, it ToString() coerces its argument before parsing.
    try {
        s1 = Symbol('123');
        t = parseFloat(s1);
        print(t);
    } catch (e) {
        //print(e.stack);
        print(e.name);
    }

    // Similarly, here Symbol() does a ToString() on its argument (a symbol here).
    try {
        s1 = Symbol(Symbol('foo'));
        print(String(s1));
    } catch (e) {
        //print(e.stack);
        print(e.name);
    }

    // But explicit .toString() returns e.g. "Symbol(foo)" which works as an
    // argument for creating an odd symbol.
    try {
        s1 = Symbol(Symbol('foo').toString());
        print(String(s1));
    } catch (e) {
        //print(e.stack);
        print(e.name);
    }

    // In ES6 String() is not a direct call to the internal ToString()
    // algorithm.  Instead, it has special support for plain symbols while
    // other values get a straight ToString() coercion.
    try {
        s1 = Symbol('123');
        print(String(s1));
    } catch (e) {
        //print(e.stack);
        print(e.name);
    }

    // Interestingly, String(Object(Symbol(...))) doesn't invoke the special
    // symbol behavior because the E6 Section 21.1.1.1 check in step 2.a is
    // only for plain symbols.  So, a Symbol object goes through ToString().
    // ToString() for an object invokes ToPrimitive() which usually returns
    // the plain symbol.  That is then ToString() coerced which results in a
    // TypeError.  At least Firefox and recent V8 behave this way also.
    s1 = Symbol('foo');
    o1 = Object(s1);
    try {
        print(String(o1));
    } catch (e) {
        //print(e.stack);
        print(e.name);
    }

    // Note that the special symbol support in String() formats the
    // symbol as "Symbol(<description>)" without invoking Symbol.prototype.toString()!
    var old = setupLoggingSymbolCoercionMethods();
    try {
        s1 = Symbol('noSideEffects');
        print(String(s1));
    } catch (e) {
        print(e.name, e);
    }
    restoreSymbolCoercionMethods(old);

    // ToBoolean(): symbol coerces to true, even empty symbol description.
    s1 = Symbol('123');
    s2 = Symbol();
    s3 = Symbol.for('');
    print(Boolean(s1));
    print(Boolean(s2));
    print(Boolean(s3));

    // ToNumber coercion is a TypeError.  Same for all ToInteger() etc variants.
    try {
        s1 = Symbol('123');
        t = Number(s1);
    } catch (e) {
        //print(e.stack);
        print(e.name);
    }

    // ToObject() coercion creates a Symbol object.  That Symbol object references
    // the argument symbol as its internal value, and non-strict compares true
    // with the symbol.  The object can also be used as a property key and will
    // reference the same property slot as the plain symbol.  (However, the object
    // is rejected by String().)
    s1 = Symbol('foo');
    o1 = Object(s1);
    s2 = Symbol('foo');
    o2 = Object(s2);

    obj = {};
    obj[s1] = 'val';
    print(obj[o1]);
    print(obj[o2]);

    print(String(s1));
    print(o1.toString());  // String(Object(Symbol(...))) is a TypeError
    print(String(s2));
    print(o2.toString());
    print(s1 == o1, s1 === o1);
    print(s1 == s2, s1 === o2);
    print(o1 == s2, o1 === o2);

    // ToPrimitive() for a plain symbol returns the symbol itself with no
    // side effects.
    //
    // ToPrimitive() for an object symbol coerces using a more complicated
    // algorithm.  If the value has @@toPrimitive it gets called.  Otherwise
    // the .valueOf() and/or .toString() methods are called depending on the
    // coercion hint.
    //
    // new Date(value) first ToPrimitive() coerces its argument, and for a
    // symbol it will then ToNumber() coerce it leading to a TypeError.
    // It will shake out side effects though which we test for here.

    // XXX: For now Duktape special cases symbols in ToPrimitive() as if
    // they had the default @@toPrimitive in E6 Section 19.4.3.4.  So this
    // test currently doesn't (correctly) trigger the @@toPrimitive side effect.

    var old = setupLoggingSymbolCoercionMethods();
    try {
        t = new Date(Symbol('foo'));
        print(t);
    } catch (e) {
        //print(e.stack);
        print(e.name);
    }
    try {
        t = new Date(Object(Symbol('foo')));
        print(t);
    } catch (e) {
        //print(e.stack);
        print(e.name);
    }
    restoreSymbolCoercionMethods(old);
}

try {
    print('symbol coercion');
    symbolCoercionTest();
} catch (e) {
    print(e.stack || e);
}

/*===
===*/

function symbolOperatorTest() {

// FIXME: addition with string+symbol, symbol+string, number+symbol, symbol+number
}

try {
    print('symbol operator');
    symbolOperatorTest();
} catch (e) {
    print(e.stack || e);
}

/*===
===*/

function symbolPropertyTest() {
    var s1, s2, s3, o1, o2, o3;
    var obj, child;

    obj = {};
    child = {}; Object.setPrototypeOf(child, obj);

    s1 = Symbol('123');
    s2 = Symbol('123');
    o1 = Object(s1);
    o2 = Object(s2);

    // Plain symbol and Object coerced Symbol reference the same property.
    obj[s1] = 'foo';
    print(obj[o1]);

    // Symbol with same description is a separate property if the symbol
    // instance is different.
    print(obj[s2]);

    // Symbol accesses are normal property accesses in that they're inherited.
    print(child[o1]);
}

try {
    print('symbol property');
    symbolPropertyTest();
} catch (e) {
    print(e.stack || e);
}

/*===
===*/

function symbolEnumerationTest() {
    var obj = {};
    var ancestor = {};
    var internalKey1 = String.fromBuffer(Duktape.dec('hex', 'ff696e68456e756d53796d48696464656e'));  // _InhEnumSymHidden
    var internalKey2 = String.fromBuffer(Duktape.dec('hex', 'ff696e684e6f6e456e756d53796d48696464656e'));  // _InhNonEnumSymHidden
    var internalKey3 = String.fromBuffer(Duktape.dec('hex', 'ff4f776e456e756d53796d48696464656e'));  // _OwnEnumSymHidden
    var internalKey4 = String.fromBuffer(Duktape.dec('hex', 'ff4f776e4e6f6e456e756d53796d48696464656e'));  // _OwnNonEnumSymHidden
    var k;

    // Test object: own and inherited properties, enumerable and
    // non-enumerable strings and symbols.

    Object.setPrototypeOf(obj, ancestor);

    Object.defineProperty(ancestor, 'inhEnumStr', {
        value: 'inhValue1',
        enumerable: true
    });
    Object.defineProperty(ancestor, 'inhNonEnumStr', {
        value: 'inhValue2',
        enumerable: false
    });
    Object.defineProperty(ancestor, Symbol.for('inhEnumSymGlobal'), {
        value: 'inhValue3',
        enumerable: true
    });
    Object.defineProperty(ancestor, Symbol.for('inhNonEnumSymGlobal'), {
        value: 'inhValue4',
        enumerable: false
    });
    Object.defineProperty(ancestor, Symbol('inhEnumSymLocal'), {
        value: 'inhValue5',
        enumerable: true
    });
    Object.defineProperty(ancestor, Symbol('inhNonEnumSymLocal'), {
        value: 'inhValue6',
        enumerable: false
    });
    Object.defineProperty(ancestor, internalKey1, {
        value: 'inhValue7',
        enumerable: true
    });
    Object.defineProperty(ancestor, internalKey2, {
        value: 'inhValue8',
        enumerable: false
    });

    Object.defineProperty(obj, 'ownEnumStr', {
        value: 'ownValue1',
        enumerable: true
    });
    Object.defineProperty(obj, 'ownNonEnumStr', {
        value: 'ownValue2',
        enumerable: false
    });
    Object.defineProperty(obj, Symbol.for('ownEnumSymGlobal'), {
        value: 'ownValue3',
        enumerable: true
    });
    Object.defineProperty(obj, Symbol.for('ownNonEnumSymGlobal'), {
        value: 'ownValue4',
        enumerable: false
    });
    Object.defineProperty(obj, Symbol('ownEnumSymLocal'), {
        value: 'ownValue5',
        enumerable: true
    });
    Object.defineProperty(obj, Symbol('ownNonEnumSymLocal'), {
        value: 'ownValue6',
        enumerable: false
    });
    Object.defineProperty(obj, internalKey3, {
        value: 'ownValue7',
        enumerable: true
    });
    Object.defineProperty(obj, internalKey4, {
        value: 'ownValue8',
        enumerable: false
    });

    // for-in
    for (k in obj) {
        print('for-in', k);
    }
}

try {
    print('symbol enumeration');
    symbolEnumerationTest();
} catch (e) {
    print(e.stack || e);
}

/*===
===*/

function symbolMiscTest() {
    var s;

    s = Symbol('123');
    print(typeof s);
    print(Object.prototype.toString.call(s));
    print(s.toString());

    s = Symbol();
    print(typeof s);
    print(Object.prototype.toString.call(s));
    print(s.toString());

    s = Symbol.for('foo');
    print(typeof s);
    print(Object.prototype.toString.call(s));
    print(s.toString());

    // Symbol doesn't have a virtual .length or index properties.  This is easy
    // to get wrong in the current implementation where symbols are internally
    // strings.
    s1 = Symbol.for('123');  // internal representation: 80 '1' '2' '3'
    print(s1.length);  // Note: cannot use '0' in s1; requires Object argument
    print(typeof s1[0], typeof s1[1], typeof s1[2], typeof s1[3]);

    // Object.prototype.toString() for plain and object symbol.
    s1 = Symbol('foo');
    print(Object.prototype.toString.call(s1));
    print(Object.prototype.toString.call(Object(s1)));
}

try {
    print('symbol misc');
    symbolMiscTest();
} catch (e) {
    print(e.stack || e);
}

    // FIXME: concatenation rule; if applied to Duktape internal symbols, breaks
    // idioms like String.fromBuffer(Duktape.dec('hex', 'ff')) + 'Value'.

    // FIXME: coercions, ToString, ToNumber(), ToBoolean(), ToObject(), etc.

    // FIXME: Symbol as property key both as plain and wrapped (= same property)

    // FIXME: enumeration

    // Object.keys()
    // Object.getOwnPropertyNames()
    // Object.getOwnPropertySymbols()

// FIXME: string indices, .length

// --> Separate custom test case?
    // FIXME: ArrayBuffer.allocPlain() coercion

    // FIXME: String.fromBuffer() and creating symbol representation directly

// FIXME: go through all DUK_TAG_STRING sites
// FIXME: go through all duk_is_string or DUK_TYPE_STRING or DUK_TYPE_MASK_STRING places
// FIXME: creating buffer from symbol

// FIXME: Object.getOwnPropertyDescriptor(), Object.defineProperty(), Object.defineProperties()

// FIXME: Object.keys(), Object.getOwnPropertyNames(), and OBject.getOwnPropertySymbols() with Proxy 'keys' trap

// FIXME: Object.getOwnPropertySymbols() for non-enumerable and enumerable symbols

// FIXME: global symbol is an OK name, what about non-global symbols: local symbol, unique symbol?

// FIXME: JSON and JX/JC serialziation of symbols and custom hidden symbols

// FIXME: symbol primitive or object was with() target

// FIXME: Symbol.prototype.toString for a variety of values; symbol, Symbol, strings, objects, etc.

// FIXME: Object.prototype.toString() for plain symbol, symbol object

// FIXME: symbol in object
// FIXME: symbolObject in object

// FIXME: symbol <, <= , >=, >

// FIXME: symbol properties on arrays

// FIXME: String prototype objects, when given a symbol as 'this'
//String.prototype.toString.call(Symbol('foo'))
//String.prototype.toString.call(Object(Symbol('foo'))) -- correct behavior?


//> Error.prototype.toString.call(Object(Symbol()))
//'Error'

//Date.parse()
//Date constructor

//arr = [1,2,3,Symbol()]
//[ 1, 2, 3, Symbol() ]
//> arr.sort()

//> JSON.stringify([1, 2, Symbol(), Symbol('foo'), Symbol.for('bar'), { foo: Symbol('foo') }])
//'[1,2,null,null,null,{}]'

// FIXME: Object.defineProperties() where keys are symbols, argument constructed manually before call.
