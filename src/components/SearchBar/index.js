// <SearchBar />
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import * as styles from '../../styles/variables.scss';

import useDebounce from './hooks/useDebounce';
import { fetchBingSearch } from './bing/api';
import { getNearestCity, getPolygonAroundPoint } from './utils';

export default () => {
  // Internal state
  const [selectionIndex, setIndex] = useState(-1);
  const [searchResults, setSearchResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState([]);
  // External state
  const { layers } = useSelector(state => state.data);
  const dispatch = useDispatch();

  // Gets the search results if user stops typing
  const debouncedSearch = useDebounce(async searchTerm => {
    const searchResults = await fetchBingSearch(searchTerm);
    setSearchResults(searchResults);
  }, 600);

  const handleItemSelected = ({ name, point }) => {
    const citiesLayer = layers.find(({ key }) => key === 'cities');
    const nearestCity = getNearestCity(point, citiesLayer);

    // If nearest city
    if (nearestCity) {
      const nearestCityProps = citiesLayer.layerConfig.props(nearestCity);
      // Set Infowindow
      dispatch({
        type: 'ui:info-window:show',
        payload: nearestCityProps,
      });
      // Set Popup
      dispatch({
        type: 'data:searchPopup',
        payload: {
          coords: nearestCity.geometry.coordinates.reverse(),
          content: nearestCityProps.popupName,
        },
      });
      setSearchTerm(nearestCityProps.popupName);
    }

    // Check if item in polygons

    // Reset search bar
    setIndex(-1);
    setSearchResults([]);
  };

  const handleEnterPress = () => {
    if (searchResults.length > 0) {
      // If user has selected an item with arrow keys
      const selectedItem =
        selectionIndex > -1
          ? // Use selected
            searchResults[selectionIndex]
          : // Otherwise use first result
            searchResults[0];
      setSearchTerm(selectedItem.name);
      handleItemSelected(selectedItem);
    }
  };

  const onKeyUp = e => {
    if (searchResults) {
      // on Enter press
      if (e.keyCode === 13) {
        handleEnterPress();
      }
      // on arrow down
      else if (e.keyCode === 40) {
        // Move cursor
        if (selectionIndex < searchResults.length - 1)
          setIndex(prevIndex => prevIndex + 1);
        else setIndex(0);
        // on arrow up
      } else if (e.keyCode === 38) {
        // Move cursor
        if (selectionIndex > 0) setIndex(prevIndex => prevIndex - 1);
        else setIndex(searchResults.length - 1);
      }
    }
  };

  return (
    <form
      id="search-bar-form"
      onSubmit={e => {
        e.preventDefault();
      }}
    >
      <div id="search-bar-div">
        <input
          onChange={async e => {
            // Set the search term
            setSearchTerm(e.target.value);
            // Fetch results
            await debouncedSearch(e.target.value);
          }}
          onKeyUp={onKeyUp}
          type="text"
          name="search"
          id="search-bar"
          aria-label="search"
          value={searchTerm}
          list="search-bar-autocomplete"
          autoComplete="off"
          placeholder="Search nation, state, city..."
        />
        <div>
          <ul id="search-bar-autocomplete">
            {searchResults &&
              searchResults.length > 0 &&
              searchResults.map((result, index) => (
                <li
                  key={index}
                  style={
                    selectionIndex === index
                      ? { color: styles.rentStrikeColor }
                      : null
                  }
                  onClick={() => {
                    const selectedItem = searchResults[index];
                    setSearchTerm(selectedItem.name);
                    handleItemSelected(selectedItem);
                  }}
                >
                  {result.name}
                </li>
              ))}
          </ul>
        </div>
      </div>
    </form>
  );
};