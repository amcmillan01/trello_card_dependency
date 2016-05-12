'use strict';

// adds card dependency functionality to trello

(function() {
  var CHECKLIST_NAME = 'card_dependency';
  var SERVICE_IMG = 'https://d78fikflryjgj.cloudfront.net/images/services/e1b7406bd79656fdd26ca46dc8963bee/trello.png';
  var totalItems = 0;
  var totalComplete = 0;
  var currentCardId = null;
  var currentChecklistId = null;
  var checklistItems = {};

  var errorHandler = function(e) {
    console.log('ERROR', e);
  };

  /**
   * get the token need for writes
   * @return {string}
   */
  var getToken = function() {
    return unescape(window.token.trim().replace('token=', ''));
  };

  /**
   *
   * @param {string} link
   * @return {Promise}
   */
  var getCardInfo = function(link) {
    var dfd = $.Deferred();
    var parts = $('<a href="' + link + '"></a>')[0].pathname.split('/');
    if (!/^https?\:\/\//.test(link)) {
      parts = ['', '', ''];
    }
    if (parts[1] === 'c' && parts[2]) {
      $.get('/1/cards/' + parts[2] + '?fields=name,labels,closed,shortUrl').then(dfd.resolve, dfd.reject);
    } else {
      dfd.resolve({
        name: link
      });
    }
    return dfd.promise();
  };

  /**
   *
   * @return {Promise}
   */
  var getCardDependencyChecklist = function() {
    var dfd = $.Deferred();
    $.get('/1/cards/' + currentCardId + '/checklists').then(function(items) {
      var checklist = items.filter(function(item) {
        return item.name === CHECKLIST_NAME;
      });
      dfd.resolve(checklist[0] ? checklist[0] : null);
    }, dfd.reject);
    return dfd.promise();
  };

  /**
   * creates the `card_dependency` checklist for the current card
   * @return {Promise}
   */
  var addChecklistToCard = function() {
    var dfd = $.Deferred();
    $.ajax({
      url: '/1/cards/' + currentCardId + '/checklists',
      contentType: 'application/json',
      type: 'POST',
      data: JSON.stringify({
        name: CHECKLIST_NAME,
        token: getToken()
      })
    }).then(function(checklist) {
      currentChecklistId = checklist.id;
      dfd.resolve(checklist);
    }, dfd.reject);

    return dfd.promise();
  };

  /**
   * add an item to the `card_dependency` checklist
   * @param {string} itemName
   * @return {Promise}
   */
  var addItemToCheckList = function(itemName) {
    var dfd = $.Deferred();

    var _add = function() {
      $.ajax({
        url: '/1/cards/' + currentCardId + '/checklist/' + currentChecklistId + '/checkItem',
        contentType: 'application/json',
        type: 'POST',
        data: JSON.stringify({
          name: itemName,
          token: getToken()
        })
      }).then(dfd.resolve, dfd.reject);
    };

    if (!currentChecklistId) {
      addChecklistToCard().then(_add, dfd.reject);
    } else {
      _add();
    }

    return dfd.promise();
  };

  /**
   * remove an item from the `card_dependency` checklist
   * @param {string} itemId
   * @return {Promise}
   */
  var removeItemFromChecklist = function(itemId) {
    return $.ajax({
      url: '/1/cards/' + currentCardId + '/checklist/' + currentChecklistId + '/checkItem/' + itemId,
      contentType: 'application/json',
      method: 'DELETE',
      data: JSON.stringify({
        token: getToken()
      })
    });
  };

  /**
   * mark a given checklist item complete
   * @param {string} itemId
   * @return {undefined}
   */
  var markChecklistItemComplete = function(itemId) {
    $.get('/1/checklist/' + currentChecklistId + '/checkItems/' + itemId + '?fields=state').then(function(r){
      if(r.state !== 'complete'){
        $.ajax({
          url: '/1/cards/' + currentCardId + '/checklist/' + currentChecklistId + '/checkItem/' + itemId,
          contentType: 'application/json',
          method: 'PUT',
          data: JSON.stringify({
            state: 'complete',
            token: getToken()
          })
        });
      }
    }, errorHandler);

  };

  /**
   * create the dependency widget below the card's description
   * @return {Element}
   */
  var getWidget = function() {
    var widget = $('.window-overlay .window-wrapper ._cd_ctn');

    if (widget.length === 0) {
      widget = $(
        '<div class="window-module _cd_ctn">' +
        '  <div class="window-module-title window-module-title-no-divider">' +
        '    <span class="window-module-title-icon icon-lg icon-card"></span>' +
        '    <h3>Card Dependencies</h3>' +
        '    <span class="spinner"></span>' +
        '  </div>' +
        '  <div class="checklist-progress">' +
        '    <span class="checklist-progress-percentage js-checklist-progress-percent">0%</span>' +
        '    <div class="checklist-progress-bar"><div class="checklist-progress-bar-current js-checklist-progress-bar" style="width: 0;"></div></div>' +
        '    <span class="checklist-completed-text hide quiet js-completed-message">Everything in this checklist is complete!</span>' +
        '  </div>' +
        '  <div class="checklist-items-list js-checklist-items-list js-no-higher-edits ui-sortable"></div>' +
        '  <div class="checklist-new-item u-gutter js-new-checklist-item hide dependencies">' +
        '    <div class="checklist-new-item-text js-new-checklist-item-input">' +
        '      <input type="url" class="_cd_input" placeholder="https://trello.com/c/card_id"><button class="_cd_add_dep">add dependency</button>' +
        '    </div>' +
        '    <div class="dep-error hide warning">' +
        '      Invalid Trello Card!' +
        '      <span class="u-float-right tooltip-trigger dismiss">dismiss</span>' +
        '    </div>' +
        '  </div>' +
        '</div>'
      );
      widget.insertAfter('.card-detail-data');
    }

    return widget;
  };

  /**
   *
   * @return {undefined}
   */
  var updatePercentCompleted = function() {
    // console.log('totalComplete', totalComplete, 'totalItems', totalItems);
    if (totalComplete) {
      var percent = (totalComplete / totalItems * 100).toFixed(0);
      var widget = getWidget();
      widget.find('.checklist-progress-percentage').html(percent + '%');
      widget.find('.checklist-progress-bar-current').width(percent + '%');
    }
  };

  /**
   * event handler for removing a dependency
   * @param {Event} e
   * @return {undefined}
   */
  var removeDependencyHandler = function(e) {
    var el = $(e.currentTarget).parents('.checklist-item');
    var itemId = e.currentTarget.dataset.id;
    removeItemFromChecklist(itemId).then(function() {
      el.remove();
      totalItems--;
      // console.log('itemId', itemId, checklistItems[itemId]);
      if(checklistItems[itemId] && checklistItems[itemId].state === 'complete'){
        // console.log('totalComplete--');
        totalComplete--;
      }
      updatePercentCompleted();
    }, errorHandler);
  };

  /**
   *
   * @param {object} card
   * @param {number} itemId
   * @param {number} index
   * @return {undefined}
   */
  var addToList = function(card, itemId, index) {
    var widget = getWidget();
    var cls = '';
    var isComplete = false;
    var labels = card.labels.map(function(label){
      var doneCls = '';
      var style = 'color:'+label.color;
      if(/^(done|complete)$/i.test(label.name)){
        style = '';
        doneCls = 'done';
        isComplete = true;
        cls += ' checklist-item-state-complete';
        totalComplete++;
      }
      return '<span class="label '+doneCls+'" style="'+style+'">'+label.name.toLocaleLowerCase()+'</span>';
    });

    if (card.closed) {
      labels.push('<span class="label closed">closed</span>');
      if (!isComplete) {
        cls += ' checklist-item-state-complete';
        totalComplete++;
      }
    }

    if (isComplete) {
      markChecklistItemComplete(itemId);
    }

    var el = $('<div class="checklist-item"></div>');
    if (typeof index === "number") {
      el = widget.find('.checklist-item:nth(' + index + ')');
    } else {
      widget.find('.checklist-items-list').append(el);
    }

    el.addClass(cls);
    el.html(
      '<div class="remove-dep" data-id="' + itemId + '">X</div>' +
      '<div class="checklist-item-details">' +
      '<p class="checklist-item-details-text markeddown js-checkitem-name">' +
      '  <a href="' + card.shortUrl + '" class="known-service-link">' +
      '    <img class="known-service-icon" src="' + SERVICE_IMG + '">' + card.name +
      '  </a>' +
      labels.join('') +
      '</p>' +
      '</div>'
    );

    el.find('.remove-dep').on('click', removeDependencyHandler);

    updatePercentCompleted();
  };

  /**
   * hide the `card_dependency` checklist
   * @return {undefined}
   */
  var hideOriginalChecklist = function() {
    $('.checklist .checklist-title .current').each(function(i, el) {
      if (el.innerText.trim().toLocaleLowerCase() === CHECKLIST_NAME) {
        $(el).parents('.checklist').hide();
      }
    });
  };

  /**
   * event handler for `add dependency` button
   * @return {undefined}
   */
  var addNewDependencyHandler = function() {
    var inputField = $(this).prev('input');
    var link = inputField.val().trim();
    var widget = getWidget();
    widget.find('.dep-error').hide();

    getCardInfo(link).then(function(card) {
      if (card.id) {
        addItemToCheckList(link).then(function(item) {
          checklistItems[item.id] = item;
          inputField.val('');
          totalItems++;
          hideOriginalChecklist();
          addToList(card, item.id);
        }, errorHandler);
      } else {
        widget.find('.dep-error').show();
      }
    }, errorHandler);
  };

  /**
   * initialize the widget
   * @return {undefined}
   */
  var init = function() {
    var widget = getWidget();
    widget.find('._cd_add_dep').on('click', addNewDependencyHandler);
    widget.find('.dismiss').on('click', function() {
      widget.find('.dep-error').hide();
    });

    widget.find('.window-module-title-icon').css({
      'background-image': 'url("' + $('#' + CHECKLIST_NAME).data().logo + '")',
      'background-size': 'cover'
    });

    hideOriginalChecklist();

    getCardDependencyChecklist().then(function(checklist) {
      widget.find('.spinner').hide();
      widget.find('.dependencies').show();

      if (checklist) {
        currentChecklistId = checklist.id;
        totalItems = checklist.checkItems.length;
        totalComplete = 0;

        widget.find('.checklist-items-list').html('<div class="checklist-item"></div>'.repeat(totalItems));

        checklist.checkItems.forEach(function(item, index) {
          getCardInfo(item.name).then(function(card) {
            checklistItems[item.id] = item;
            addToList(card, item.id, index);
          }, errorHandler);
        });
      }
    }, errorHandler);
  };

  // listen to messages from cs/index.js
  window.addEventListener('message', function(event) {
    var data = event.data || {};

    if (typeof data !== 'object') {
      return;
    }

    data.__ns = data.__ns || '';
    if (data.__ns !== CHECKLIST_NAME) {
      return;
    }
    // console.log('FROM BG', data);
    checklistItems = {};

    setTimeout(function() {
      if (location.pathname.match(/^\/c\//)) {
        var parts = location.pathname.split('/');
        $.get('/1/cards/' + parts[2] + '?fields=name').then(function(card) {
          currentCardId = card.id;
          init();
        }, errorHandler);
      }
    }, 400);

  });

})();
