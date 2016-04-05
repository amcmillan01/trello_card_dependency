'use strict';

// adds card dependency functionality to trello

(function() {
  var CHECKLIST_NAME = 'card_dependency';
  var SERVICE_IMG = 'https://d78fikflryjgj.cloudfront.net/images/services/e1b7406bd79656fdd26ca46dc8963bee/trello.png';
  var totalItems = 0;
  var totalComplete = 0;
  var currentCardId = null;
  var currentChecklistId = null;

  var errorHandler = function(e){
    console.log('ERROR', e);
  };

  var getCardInfo = function(link){
    var dfd = $.Deferred();
    var parts = $('<a href="' + link + '"></a>')[0].pathname.split('/');
    if(!/^https?\:\/\//.test(link)){
      parts = ['', '', ''];
    }
    if (parts[1] === 'c' && parts[2]) {
      $.get('/1/cards/'+parts[2] + '?fields=name,labels,closed,shortUrl').then(dfd.resolve, dfd.reject);
    } else {
      dfd.resolve({
        name: link
      });
  }
    return dfd.promise();
  };

  var getCardDependencyChecklist = function() {
    var dfd = $.Deferred();
    $.get('/1/cards/' + currentCardId + '/checklists').then(function(items){
      var checklist = items.filter(function(item){
        return item.name === CHECKLIST_NAME;
      });
      dfd.resolve(checklist[0]? checklist[0] : null);
    }, dfd.reject);
    return dfd.promise();
  };

  var addItemToCheckList = function(itemName){
    return $.ajax({
      url: '/1/cards/' + currentCardId + '/checklist/' + currentChecklistId + '/checkItem',
      contentType: 'application/json',
      type: 'POST',
      data : JSON.stringify({
        name: itemName,
        token: unescape(window.token.trim().replace('token=', ''))
      })
    });
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
        '  <div class="checklist-items-list js-checklist-items-list js-no-higher-edits ui-sortable"></div>'+
        '  <div class="checklist-new-item u-gutter js-new-checklist-item hide dependencies">' +
        '    <div class="checklist-new-item-text js-new-checklist-item-input">' +
        '      <input type="url" class="_cd_input" placeholder="https://trello.com/c/card_id"><button class="_cd_add_dep">add dependency</button>' +
        '    </div>' +
        '    <div class="dep-error hide warning">Invalid Trello Card!</div>'+
        '  </div>' +
        '</div>'
      );
      widget.insertAfter('.card-detail-data');
    }

    return widget;
  };

  /**
   *
   * @param {number} percent
   * @return {undefined}
   */
  var updatePercentCompleted = function(percent){
    var widget = getWidget();
    widget.find('.checklist-progress-percentage').html(percent + '%');
    widget.find('.checklist-progress-bar-current').width(percent + '%');
  };

  /**
   *
   * @param {object} card
   * @params {number} index
   * @return {undefined}
   */
  var addToList = function(card, index) {
    var widget = getWidget();
    var cls = '';
    var doneEl = '';
    var isComplete = false;
    var doneLabel = card.labels.filter(function(o) {
      return /^done$/i.test(o.name);
    });

    if (doneLabel[0]) {
      cls += ' checklist-item-state-complete';
      doneEl = '<span class="done">complete</span>';
      isComplete = true;
      totalComplete++;
    }

    if (card.closed) {
      cls += ' checklist-item-state-complete';
      doneEl = '<span class="closed">closed</span>';
      if (!isComplete) {
        totalComplete++;
      }
    }

    var el = $('<div class="checklist-item"></div>');
    if (typeof index === "number") {
      el = widget.find('.checklist-item:nth(' + index + ')');
    } else {
      widget.find('.checklist-items-list').append(el);
    }

    el.addClass(cls);
    el.html(
      '<div class="checklist-item-details">' +
      '<p class="checklist-item-details-text markeddown js-checkitem-name">' +
      '  <a href="' + card.shortUrl + '" class="known-service-link">' +
      '    <img class="known-service-icon" src="' + SERVICE_IMG + '">' + card.name +
      '  </a>' +
      doneEl +
      '</p>' +
      '</div>'
    );

    if (totalComplete) {
      updatePercentCompleted( (totalComplete / totalItems * 100).toFixed(0));
    }
  };

  var addNewDependencyHandler = function() {
    var inputField = $(this).prev('input');
    var link = inputField.val().trim();
    var widget = getWidget();
    widget.find('.dep-error').hide();

    getCardInfo(link).then(function(card){
      if(card.id){
        addItemToCheckList(link).then(function(item){
          console.log('checkItemslink', item);
          inputField.val('');
          addToList(card);
        }, errorHandler);
      } else {
        widget.find('.dep-error').show();
      }
    }, errorHandler);
  };

  var hideOriginalChecklist = function(){
    $('.checklist .checklist-title .current').each(function(i, el){
      if (el.innerText.trim().toLocaleLowerCase() === CHECKLIST_NAME){
        $(el).parents('.checklist').hide();
      }
    });
  };

  /**
   *
   * @return {undefined}
   */
  var init = function() {
    var widget = getWidget();
    widget.find('._cd_add_dep').on('click', addNewDependencyHandler);

    hideOriginalChecklist();

    getCardDependencyChecklist().then(function(checklist){
      widget.find('.spinner').hide();
      widget.find('.dependencies').show();

      if(checklist){
        currentChecklistId = checklist.id;
        totalItems = checklist.checkItems.length;
        totalComplete = 0;

        widget.find('.checklist-items-list').html('<div class="checklist-item"></div>'.repeat(totalItems));

        checklist.checkItems.forEach(function(item, index){
          getCardInfo(item.name).then(function(card) {
            addToList(card, index);
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
    console.log('FROM BG', data);

    setTimeout(function() {
      $.get('/1/cards/' + data.shortlink + '?fields=name').then(function(card) {
        currentCardId = card.id;
        init();
      }, errorHandler);
    }, 200);

  });

})();
