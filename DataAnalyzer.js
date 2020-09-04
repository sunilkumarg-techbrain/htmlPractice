/*
Data Analyzer
Author       : Niral Soni
Date created : 10-Jan-2013
Version      : 1.0
Email        : soniniral@yahoo.co.in
*/

function DataAnalyzer(thisObject, dataSourceId, vHeaderStartsAt, vAddFilter, vBypassCols, vAnalyzeCols) {
  var selfObject      = thisObject,
  dataSource          = _ge(dataSourceId) || null,
  headerStartsAt      = vHeaderStartsAt || 1,
  addFilter           = vAddFilter || false,
  bypassCols          = vBypassCols || [],
  analyzeCols         = vAnalyzeCols || [],
  MetaData            = null,
  Charts              = null,
  sourceList          = null,
  sourceType          = 0,
  ErrorCode           = { 'SOURCE_NOT_SET'    : '"DataSource" is not set.',
                        'INVALID_OBJECT'      : '"DataSource" is not an Object.',
                        'INVALID_TABLE'       : '"DataSource" is not a Table Object.',
                        'HEADERROWS_NOT_SET'  : '"headerStartsAt" count is not set.',
                        'INVALID_NUMBER'      : 'Specified value in "HeaderRows" is not a Number.',
                        'OUT_OF_RANGE'        : 'Specified value in "HeaderRows" is out of range.',
                        'NO_DATA_AVAILABLE'   : '"DataSource" does not contain any data to analyze',
                        'SUCCESS'             : 'Success',
                        'INVALID_VALUE'       : 'Method invoked with improper values.',
                        'NO_METADATA'         : 'Metadata is not available.'},
  DataTypes           = { 'NULL'              : 0,
                          'NUMBER'            : 1,
                          'STRING'            : 2},
  SourceTypes         = { 'ALL_COLUMNS'       : 0,
                          'ANALYZE_COLUMNS'   : 1,
                          'BYPASS_COLUMNS'    : 2}
	autoAnalyzeOnFilter = false,
	filterOnly          = false;

  function init() {
    MetaData      = [];
    Charts        = [{'Title': 'Show All Charts'}];
    sourceList    = [];
    sourceType    = SourceTypes.ALL_COLUMNS;
    if(dataSource == null) { return ErrorCode.SOURCE_NOT_SET; }

    if(typeof dataSource != 'object') { return ErrorCode.INVALID_OBJECT; }

    if(dataSource.nodeName.toUpperCase() != 'TABLE') { return ErrorCode.INVALID_TABLE; }

    if(headerStartsAt == null) { return ErrorCode.HEADERROWS_NOT_SET; }

    if(typeof headerStartsAt != 'number') { return ErrorCode.INVALID_NUMBER; }

    if((dataSource.rows.length - headerStartsAt) < 0 ) { return ErrorCode.OUT_OF_RANGE; }

    if((dataSource.rows.length - headerStartsAt) == 0) { return ErrorCode.NO_DATA_AVAILABLE; }

    if(analyzeCols.length > 0) {
      sourceList = analyzeCols;
      sourceType = SourceTypes.ANALYZE_COLUMNS;
    }
    else if(bypassCols.length > 0)  {
      sourceList = bypassCols;
      sourceType = SourceTypes.BYPASS_COLUMNS;
    }
    return ErrorCode.SUCCESS;
  }

  function columnExists(compareText, compareIndex) {
    for(var colCount = 0, colLength = sourceList.length; colCount < colLength; colCount++) {
      var colValue = sourceList[colCount];
      if(colValue == null) continue;

      colValue = Trim(colValue);
      if(colValue.length == 0) continue;

      if(isNaN(colValue) && colValue == compareText) return true;
      else if(parseInt(colValue,10) == compareIndex) return true;
    }
    return false;
  }

  function analyzeHeaders() {
    var rowCount = headerStartsAt - 1;
    var currentRow = dataSource.rows[rowCount];
    if(currentRow.cells == null) return;

    for(var colCount = 0, colLength = currentRow.cells.length; colCount < colLength; colCount++) {
      MetaData[colCount] = null;

      if(currentRow.cells[colCount] == null) continue;

      var colText = (document.all) ? currentRow.cells[colCount].innerText : currentRow.cells[colCount].textContent;
      if(colText == null) continue;

      colText = Trim(colText);
      if(colText.length == 0) continue;

      var colExists = columnExists(colText, colCount);

      if((colExists && sourceType == SourceTypes.ANALYZE_COLUMNS) ||
          (!colExists && sourceType == SourceTypes.BYPASS_COLUMNS) ||
            sourceType == SourceTypes.ALL_COLUMNS ) {
        MetaData[colCount]              = {};
        MetaData[colCount].columnRow    = rowCount;
        MetaData[colCount].columnIndex  = colCount;
        MetaData[colCount].columnLabel  = colText;
        MetaData[colCount].columnType   = DataTypes.NULL;
        MetaData[colCount].columnData   = {};
      }
      else {
        MetaData[colCount] = null;
      }
    }
    if(addFilter) {
      addAutoFilter();
    }
  }

  function addAutoFilter() {
    if(_ge('filterHolder')) return;
    var filterHolder = document.createElement('DIV');
    filterHolder.id = 'filterHolder';
    dataSource.parentNode.insertBefore(filterHolder, dataSource);
    var filterContent = '<span style="float: left;">Filter By: <select id="CmbSearch">' + 
        '<option value="-1">Global Search</option>';
    for(var i = 0, j = MetaData.length; i < j; i++ ) {
      if(MetaData[i] == null) continue;
      filterContent += '<option value="' + MetaData[i].columnIndex + '">' + MetaData[i].columnLabel + '</option>';
    }
    filterContent += '</select><input onkeyup="' + selfObject + '.filterTable(this, \'' + 
        dataSource.id + '\', this.previousSibling.value,' + headerStartsAt + ')" type="text">';
    filterContent += '<input type="button" value="Clear" onclick="this.previousSibling.value = \'\'; ' + 
        'this.previousSibling.onkeyup();"></span>';
    filterContent += '<span id="TotalCount" style="float: right;">Total Records - ' + 
        (dataSource.rows.length-headerStartsAt) + '</span>';
    filterHolder.innerHTML = filterContent;
  }

  function analyzeData() {
    var visibleRows = 0, currentRow, currentCell, length, count, uniqueCount = 0;
    for(var rowCount = headerStartsAt, rowLength = dataSource.rows.length; rowCount < rowLength; rowCount++) {
      currentRow = dataSource.rows[rowCount];
      if(currentRow.style.display == 'none') continue;
      visibleRows++;

      for(var colCount = 0, colLength = currentRow.cells.length; colCount < colLength; colCount++) {
        if(MetaData[colCount] == null) continue;
        currentCell = currentRow.cells[colCount];
        if(currentCell == null) continue;

        var colText = (document.all) ? currentCell.innerText : currentCell.textContent;
        if(colText == null) continue;

        colText = Trim(colText);
        if(colText.length == 0) continue;

        if(isNaN(colText) && MetaData[colCount].columnType <= DataTypes.STRING) {
          MetaData[colCount].columnType = DataTypes.STRING;
        }
        else if(MetaData[colCount].columnType <= DataTypes.NUMBER) {
          MetaData[colCount].columnType = DataTypes.NUMBER;
        }

        if(MetaData[colCount].columnData[colText] == null) {
          MetaData[colCount].columnData[colText]        = {};
          MetaData[colCount].columnData[colText].Count  = 1;
          MetaData[colCount].columnData[colText].Rows   = [];
        }
        else {
          MetaData[colCount].columnData[colText].Count =
            (MetaData[colCount].columnData[colText].Count + 1);
        }
        length = MetaData[colCount].columnData[colText].Rows.length;
        MetaData[colCount].columnData[colText].Rows[length] = rowCount;
      }
    }
    for(count = 0, length = MetaData.length; count < length; count++) {
      if(MetaData[count] == null) continue;
      uniqueCount = 0;
      for(data in MetaData[count].columnData) uniqueCount++;

      if(uniqueCount == visibleRows) {
        MetaData[count] = null;
      }
      else {
        MetaData[count].DataLength = uniqueCount;
      }
    }
  }

  function prepareDataSets() {
    var report_prefix = '', count;
    Charts = [{'Title': 'Show All Charts'}];
    for(count = 0; count < MetaData.length; count++) {
      if(MetaData[count] == null) continue;

      var DataSet = [];
      for(columnName in MetaData[count].columnData) {
        var data = [];
        data[0] = columnName;
        data[1] = MetaData[count].columnData[columnName].Count;
        DataSet[DataSet.length] = data;
      }
      if(DataSet.length > 1) {
        var length = Charts.length;
        Charts[length] = {};
        Charts[length].Title    = 'Group by ' + MetaData[count].columnLabel;
        Charts[length].LabelX = MetaData[count].columnLabel;
        Charts[length].LabelY = "Count";
        Charts[length].Source = count;
        Charts[length].DataSet  = DataSet;
      }
      else if(DataSet.length == 1) {
        report_prefix += MetaData[count].columnLabel + '=' + DataSet[0][0] + ' and ';
      }
      MetaData[count].columnData = {};
    }
    if(report_prefix.length > 0) {
      report_prefix = ' for ' + report_prefix.substr(0 , report_prefix.length-5);
      for(count = 0; count < Charts.length; count++) {
          Charts[count].Title = Charts[count].Title + report_prefix;
      }
    }
  }

  function report() {
    var statusObj = _ge('AnalysisStatus'),
		errMsgObj = _ge('errMsg'),
    dest = _ge('chartContainer'),
    details = [{'label'       : 'Draw : ', 
                    'attributes'  : { 'id'        : 'cmbChartSrc',
                                      'onchange'  : '_ge("cmbPossibleCharts").onchange()'
                                    }, 
                    'data'        : ['Flash Chart', 'JS Chart'], 
                    'value'       : ['Flash Chart', 'JS Chart'] 
                  },
                  { 'label'       : '&nbsp;&nbsp;Chart Type : ', 
                    'attributes'  : { 'id'        : 'cmbChartType', 
                                      'onchange'  : '_ge("cmbPossibleCharts").onchange()'
                                    }, 
                    'data'        : ['Bar Chart', 'Pie Chart'], 
                    'value'       : ['bar', 'pie'] 
                  },
                  { 'label'       : '&nbsp;&nbsp;Possible Charts : ', 
                    'attributes'  : { 'id'        : 'cmbPossibleCharts', 
                                      'size'      : 1, 
                                      'onchange'  : selfObject + '.draw(this.value);' 
                                    }, 
                    'data'        : ['----Select----'], 
                    'value'       : [-1] 
                  }],
    option, cmbObj, chartType;
    cmbObj = _ge('cmbPossibleCharts');
    if(Charts.length > 1) {
      if(cmbObj == null) {
        for(var i = 0; i < details.length; i++) {
          cmbObj = document.createElement('select');
          for(attr in details[i].attributes) {
            cmbObj.setAttribute(attr, details[i].attributes[attr]);
          }
          for(var j = 0; j < details[i].data.length; j++) {
            option = document.createElement('option');
            option.value = details[i].value[j];
            option.text = details[i].data[j];
            try { cmbObj.add(option); }
            catch (e) { cmbObj.add(option, null); }
          }
          statusObj.innerHTML += details[i].label;
          statusObj.appendChild(cmbObj);
        }
      }
      else {
        cmbObj.options.length = 1;
      }
      cmbObj.options[0].selected = true;
      for(var count = 0; count < Charts.length; count++) {
        option = document.createElement('option');
        option.value = count;
        option.text = Charts[count].Title;
        try { cmbObj.add(option); }
        catch (e) { cmbObj.add(option, null); }
      }
      cmbObj.options[1].value = Charts.length;
      if(errMsgObj) {
        errMsgObj.innerHTML = '';
      }
    }
    else {
      cmbObj.options.length = 1;
      if(!errMsgObj) {
        errMsgObj = document.createElement('span');
        errMsgObj.id = 'errMsg';
        statusObj.appendChild(errMsgObj);
      }
      errMsgObj.innerHTML = '<br>No "Group By" Charts possible as all available records are distinct.';
    }
    dest.innerHTML = '';
  }

  function Trim(s) {
    if(s.length > 0) {
      while (s.substring(0,1) == ' ') s = s.substring(1,s.length);
      while (s.substring(s.length-1,s.length) == ' ') s = s.substring(0,s.length-1);
      if(s.search(/[\S]/) == -1) s="";
    }
    return s;
  }

	function analyze() {
    analyzeHeaders();
    if(addFilter && filterOnly) return true;
    analyzeData();
    prepareDataSets();
    report();
	}

  this.start = function(vFilterOnly, vAutoAnalyzeOnFilter) {
    var status = init();
		autoAnalyzeOnFilter = vAutoAnalyzeOnFilter || autoAnalyzeOnFilter;
		filterOnly = vFilterOnly || filterOnly;
    if(status != ErrorCode.SUCCESS) {
      alert(status);
      return false;
    }
		analyze();
		return true;
  }

  this.filterTable = function(phrase, tableId, searchIn, headerStartsAt) {
    var words = phrase.value.toLowerCase().split(" "),
				table = _ge(tableId), ele, i,
				cnt   = headerStartsAt || 1;
    for (var r = cnt; r < table.rows.length; r++) {
			searchIn = (typeof searchIn == 'undefined' || searchIn == null ) ? -1 : searchIn;
      if(parseInt(searchIn,10) == -1)
        ele = (document.all) ? table.rows[r].innerText : table.rows[r].textContent;
      else if(parseInt(searchIn,10) > -1)
        ele = (document.all) ? table.rows[r].cells[searchIn].innerText : table.rows[r].cells[searchIn].textContent;

      var displayStyle = '';
      for (i = 0; i < words.length; i++) {
        if (ele.toLowerCase().indexOf(words[i])>=0) {
          displayStyle = '';
        }
        else {
          displayStyle = 'none';
          cnt++;
          break;
         }
      }
      table.rows[r].style.display = displayStyle;
    }
    _ge('TotalCount').innerHTML = "Total Records - " + (table.rows.length-cnt);
    cnt = 0;
    for(i = headerStartsAt; i < table.rows.length; i++) {
      if(table.rows[i].style.display != 'none') {
        table.rows[i].className = (cnt%2 == 0) ? 'TablerowBG1' : 'TablerowBG2';
        cnt++;
      }
    }
		if(!filterOnly && autoAnalyzeOnFilter) {
			analyze();
		}
  }

  this.draw = function(reportIndex) {
    var dest = _ge('chartContainer');
    dest.innerHTML = '';
    if(reportIndex == -1) return;
    var count = (reportIndex == Charts.length) ? 1 : reportIndex;
    var chartSrc =  _ge('cmbChartSrc').value;
    var chartType =  _ge('cmbChartType').value;
    do {
      var div = document.createElement('div');
      div.id = "Report" + count;
      div.className = 'chartCSS';
      dest.appendChild(div);
      if(chartSrc == 'JS Chart') {
        window['myChart'+count] = new JSChart(div.id, chartType);
        window['myChart'+count].setDataArray(Charts[count].DataSet);
        window['myChart'+count].setTitle(Charts[count].Title);
        window['myChart'+count].setAxisNameX(Charts[count].LabelX);
        window['myChart'+count].setAxisNameY(Charts[count].LabelY);
        window['myChart'+count].setSize(800, 250);
        window['myChart'+count].draw();
      }
      else if(chartSrc == 'Flash Chart') {
        window['myChart'+count] = new SWFObject("open-flash-chart.swf", div.id, "800", "250", "9", "#FFFFFF");
        window['myChart'+count].addVariable("variables","true");
        window['myChart'+count].addVariable('x_label_style','10,0x0000FF,2');
        window['myChart'+count].addVariable("colours", "#d01f3c,#356aa0,#C79810,#73880A,#D15600,#6BBA70,#D54C78,#C31812");
        window['myChart'+count].addVariable("tool_tip", Charts[count].LabelX + ": #x_label#<br>Records: #val#");
        window['myChart'+count].addVariable((chartType == 'pie' ? 'pie' : 'bar_glass'), '50,#7E97A6');
        window['myChart'+count].addVariable("title",Charts[count].Title + ',{font-size: 16px;}');
        window['myChart'+count].addVariable("x_legend",Charts[count].LabelX + ',12,#40515B');
        window['myChart'+count].addVariable("y_legend",Charts[count].LabelY + ',12,#40515B');
        window['myChart'+count].addVariable('y_min','0');
        var lbl = cnt = '', max = 0;
        for(var j = 0, dataset = Charts[count].DataSet; j < dataset.length; j++) {
          lbl += dataset[j][0] + (j == dataset.length -1 ? '' : ',');
          cnt += dataset[j][1] + (j == dataset.length -1 ? '' : ',');
          max = (dataset[j][1] > max) ? dataset[j][1] : max;
        }
        window['myChart'+count].addVariable('y_max',max+5);
        window['myChart'+count].addVariable("values", cnt);
        window['myChart'+count].addVariable((chartType == 'pie' ? 'pie' : 'x') + "_labels",lbl);
        window['myChart'+count].write(div.id);
      }
      count++;
    }while(count < reportIndex);
  }
}

function _ge(id) {
	return document.getElementById(id);
}
