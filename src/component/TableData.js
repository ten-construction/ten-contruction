'use strict'

import React, { useEffect, useRef, useState } from 'react';
import { SearchOutlined } from '@ant-design/icons';
import { Button, Input, Space, Table, Popconfirm, message, Select } from 'antd';
import Highlighter from 'react-highlight-words';
import { toRupiahFormat } from "../lib/IntegerHelper";

const { Option } = Select;

function TableData({ dataSource, loading, columns, handleDeleteProp, popUpConfirmMessage, isHaveDetail, showDetailProp, handleUpdateEmploymentProp, employmentData, handleUpdateProp}){
    const [searchText, setSearchText] = useState(''); 
    const [searchedColumn, setSearchedColumn] = useState('');
    const [columnData, setColumnData] = useState([]);
    const searchInput = useRef(null);

    // For popup notification
    const [contextHolder] = message.useMessage();

    useEffect(() => {
      let newColumnData = []
      for (const column of columns) {
        newColumnData.push({
          ...getColumnSearchProps(column),
          title: (column.charAt(0).toUpperCase() + column.slice(1)).split('_').join(' '),
          dataIndex: column,
          key: column,
          width: '10%',
          sorter: (a, b) => {
            if (column == 'tanggal_dibuat') {
              return a['created_at_mili_seconds']-b['created_at_mili_seconds']
            }else if (column == 'tanggal_diupdate') {
              return a['updated_at_mili_seconds']-b['updated_at_mili_seconds']
            }else if (column == 'gaji') {
              return a['salary_integer']-b['salary_integer']
            }else if (typeof(a[column]) == 'number' && typeof(b[column]) == 'number') {
              return a[column] - b[column]
            }
            return a[column].length - b[column].length
          },
          sortDirections: ['descend', 'ascend'],
          render: (text, record, index) => {
            if (column == 'pekerjaan' && record.pekerjaan == '' &&  handleUpdateEmploymentProp !== undefined  && employmentData !== undefined) {
              return <>
                <Select placeholder="Pilih Pekerjaan" onChange={(value) => handleUpdateEmploymentProp(value, record.id)}>
                    {
                        employmentData.map(itm => {
                            return (
                                <Option value={itm.id}>{itm.name} ({toRupiahFormat(itm.salary)})</Option>
                            )
                        })
                    }
                </Select>
              </>
            }
            
            return text;
          },
        })
      }

      newColumnData = [...newColumnData, {
        title: 'Aksi',
        dataIndex: 'aksi  ',
        width: '25%',
        render: (_, record) =>
          <>
            <Popconfirm title={ popUpConfirmMessage || "Sure to delete?" } onConfirm={() => handleDelete(record.id)}>
              <Button danger>Delete</Button>
            </Popconfirm>

            {handleUpdateProp !== undefined && 
              <Button style={{display: "inline", marginLeft: 8}} onClick={() => handleUpdateProp(record)}>Update</Button>
            }
          </>
      }]

      if (isHaveDetail) {
        newColumnData = [...newColumnData, {
          title: 'Detail',
          dataIndex: 'detail',
          width: '10%',
          render: (_, record) =>
            <Button
              onClick={() => showDetailProp(record)}
              size="small"
              style={{ width: 90 }}
            >
              Click Detail
            </Button>
        }]
      }
    
      setColumnData(newColumnData);
    }, [columns]);
    
    const handleDelete = itemId => {
      handleDeleteProp(itemId)
    };

    const handleSearch = (selectedKeys, confirm, dataIndex) => {
      confirm();
      setSearchText(selectedKeys[0]);
      setSearchedColumn(dataIndex);
    };

    const handleReset = clearFilters => {
      clearFilters();
      setSearchText('');
    };

    const getColumnSearchProps = dataIndex => ({
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters, close }) => (
        <div style={{ padding: 8 }} onKeyDown={e => e.stopPropagation()}>
          <Input
            ref={searchInput}
            placeholder={`Search ${dataIndex}`}
            value={selectedKeys[0]}
            onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
            onPressEnter={() => handleSearch(selectedKeys, confirm, dataIndex)}
            style={{ marginBottom: 8, display: 'block' }}
          />
          <Space>
            <Button
              type="primary"
              onClick={() => handleSearch(selectedKeys, confirm, dataIndex)}
              icon={<SearchOutlined />}
              size="small"
              style={{ width: 90 }}
            >
              Search
            </Button>
            <Button
              onClick={() => clearFilters && handleReset(clearFilters)}
              size="small"
              style={{ width: 90 }}
            >
              Reset
            </Button>
            <Button
              type="link"
              size="small"
              onClick={() => {
                confirm({ closeDropdown: false });
                setSearchText(selectedKeys[0]);
                setSearchedColumn(dataIndex);
              }}
            >
              Filter
            </Button>
            <Button
              type="link"
              size="small"
              onClick={() => {
                close();
              }}
            >
              close
            </Button>
          </Space>
        </div>
      ),
      filterIcon: filtered => <SearchOutlined style={{ color: filtered ? '#1677ff' : undefined }} />,
      onFilter: (value, record) =>
        record[dataIndex].toString().toLowerCase().includes(value.toLowerCase()),
      filterDropdownProps: {
        onOpenChange(open) {
          if (open) {
            setTimeout(() => {
              var _a;
              return (_a = searchInput.current) === null || _a === void 0 ? void 0 : _a.select();
            }, 100);
          }
        },
      },
      render: text =>
        searchedColumn === dataIndex ? (
          <Highlighter
            highlightStyle={{ backgroundColor: '#ffc069', padding: 0 }}
            searchWords={[searchText]}
            autoEscape
            textToHighlight={text ? text.toString() : ''}
          />
        ) : (
          text
        ),
    });
    
    return (
      <Table 
        dataSource={dataSource}
        columns={columnData}
        loading={loading}
        scroll={{ x: 'max-content' }}
        pagination={false}
      />
    );
}

export default TableData;