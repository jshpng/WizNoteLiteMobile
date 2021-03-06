import React from 'react';
import EventEmitter from 'events';
import isEqual from 'lodash.isequal';
import cloneDeep from 'lodash.clonedeep';

class SimpleStore {
  constructor() {
    this._data = {};
    this._listener = new EventEmitter();
  }

  subscribe(key, listener) {
    console.debug(`subscribe ${key}`);
    this._listener.on(key, listener);
  }

  unsubscribe(key, listener) {
    console.debug(`unsubscribe ${key}`);
    this._listener.off(key, listener);
  }

  setData(key, data, callback) {
    const old = this._data[key];
    if (isEqual(data, old)) {
      return;
    }
    this._data[key] = data;
    if (callback) {
      callback(key, data);
    }
    this._listener.emit(key, key, data);
  }

  getData(key) {
    return cloneDeep(this._data[key]);
  }

  hasKey(key) {
    return this._data[key] !== undefined;
  }
}

const store = new SimpleStore();

export default store;

export function connect(keyOrKeys) {
  //
  function toArray(o) {
    if (Array.isArray(o)) {
      return o;
    }
    return [o];
  }
  //
  const keys = toArray(keyOrKeys);
  //
  return function wrapWithConnect(WrappedComponent) {
    class Connect extends React.Component {
      constructor(props, context) {
        super(props, context);
        this.state = {};
        this.nextProps = props;
        //
        keys.forEach((key) => {
          this.state[key] = store.getData(key);
        });
      }

      componentDidMount() {
        //
        keys.forEach((key) => {
          if (typeof key === 'function') {
            const subKeys = key(this.props);
            toArray(subKeys).forEach((subKey) => {
              store.subscribe(subKey, this.handleDataChange);
            });
          } else {
            store.subscribe(key, this.handleDataChange);
          }
        });
      }

      shouldComponentUpdate(nextProps) {
        this.nextProps = nextProps;
        return true;
      }

      componentWillUnmount() {
        keys.forEach((key) => {
          if (typeof key === 'function') {
            const subKeys = key(this.props);
            toArray(subKeys).forEach((subKey) => {
              store.unsubscribe(subKey, this.handleDataChange);
            });
          } else {
            store.unsubscribe(key, this.handleDataChange);
          }
        });
      }

      handleDataChange = (key, data) => {
        const state = {};
        state[key] = data;
        this.setState(state);
      }

      render() {
        const { forwardedRef, ...rest } = this.nextProps;
        // eslint-disable-next-line react/jsx-props-no-spreading
        return <WrappedComponent ref={forwardedRef} {...rest} {...this.state} />;
      }
    }

    // eslint-disable-next-line react/jsx-props-no-spreading
    return React.forwardRef((props, ref) => (<Connect {...props} forwardedRef={ref} />));
  };
}
