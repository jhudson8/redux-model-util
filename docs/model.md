Model
---------------
Anytime the [./model-provider.md](model provider) wrapper React class is used, a Model will be included as a property to be used when rendering.  The Model API can be used to determine the status of fetch requests, retrieve meta data and action response values and more.  It can also be extended to add your own custom functions.

### example
```
  // my react class
  render: function () {
    var model = this.props.model;
    if (model.fetchError()) {
      return <div>fetch error</div>;
    } else if (model.isFetchPending()) {
      return <div>loading...</div>;
    } else {
      var value = model.value();  // this is your model contents
      return (
        <div>
          first name: {value.firstName}
        </div>
      );
    }
  }
```

### API

#### data
Return any meta data which can be set using the [action creator](./action-creator.md).  This is handy when your model is actually an array and you want to keep track of the total count or other related information.
```javascript
  render: function () {
    const model = this.props.model;
    const data = model.data();
    const totalRowCount = data.totalRowCount;  // or some other data that would have been set with your action creator
  }
```

#### value
Return the model content or undefined if it does not exist.  ***note*** as long as the mode id exists in the properties, the [model provider](./model-provider.md) will always provide a Model object even if the model content does not exist.  Because of this, the `value` method may return `undefined`;
```javascript
  render: function () {
    const model = this.props.model;
    const value = model.value();
    if (value) {
      // the model has been fetched and loaded
      const firstName = model.firstName;  // or some other data that your model would contain
    }
  }
```

#### wasFetched
Return `true` if the model has been sucessfully fetched.  If `true`, the `value` function will always return the model contents.
```javascript
  render: function () {
    const model = this.props.model;
    if (model.wasFetched()) {
      // ...
    }
  }
```

#### isFetchPending
Return `true` if the model has an outstanding XHR fetch request.
```javascript
  render: function () {
    const model = this.props.model;
    if (model.isFetchPending()) {
      return <div>Loading...</div>;
    }
  }
```

#### fetchError
If a model XHR fetch failed, return the error response.  Otherwise return `undefined`.
```javascript
  render: function () {
    const model = this.props.model;
    const fetchError = model.fetchError();
    if (model.fetchError) {
      return <div>The data could not be fetched</div>;
    }
  }
```

#### isActionPending
Return the `action id` if an action XHR is pending (see `createXHRAction` in [./action-creator.md](./action-creator.md).  Optionally the `action id` can be passed as a parameter to only return true if the action being performed matches the provided `action id`.
```javascript
  render: function () {
    const model = this.props.model;
    if (model.isActionPending('update')) {
      return <div>Updating the model</div>;
    }
  }
```

#### wasActionPerformed
The last action performed, unless cleared, will always be returned.  The return object shape is
```
{
  id: _action id_,
  success: _action response if successful_,
  error: _action response if non 200 status code_
}
```