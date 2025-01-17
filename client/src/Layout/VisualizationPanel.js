import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  Drawer,
  IconButton,
  Typography,
  FormControl,
  FormLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Select,
  MenuItem,
  Button,
  Tooltip,
  Checkbox,
  FormControlLabel,
  Slider,
  ListSubheader,
  CircularProgress
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoIcon from '@mui/icons-material/Info';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import diversityIndices from '../shared/vocabularies/diversityIndices.json';
import {
  setSelectedIndices,
  setColorPalette,
  setUseQuantiles,
  setValueRange,
  setMinRecords,
  selectQuantileBins,
  selectColorSchemeType
} from '../store/visualizationSlice';
import { PALETTES, getPalettesForType } from '../utils/colorScales';

const drawerWidth = 340;

const VisualizationPanel = ({ isOpen, onClose, isCollapsed, handlePanelOpen }) => {
  const dispatch = useDispatch();
  
  // Get state from Redux
  const {
    selectedIndices,
    colorPalette,
    useQuantiles,
    valueRange,
    minRecords
  } = useSelector(state => state.visualization);
  
  const quantileBins = useSelector(selectQuantileBins);
  const colorSchemeType = useSelector(selectColorSchemeType);
  const { status, indices: computedIndices, error, geoJSON } = useSelector(state => state.results);
  const hasResults = status === 'completed' && computedIndices.length > 0;
  const isLoading = status === 'running';
  const hasFailed = status === 'failed';

  // Debug logging
  useEffect(() => {
    console.log('VisualizationPanel state:', {
      isOpen,
      status,
      computedIndices,
      selectedIndices,
      hasResults,
      isLoading,
      hasFailed,
      colorSchemeType,
      geoJSON: geoJSON ? {
        type: geoJSON.type,
        featureCount: geoJSON.features?.length
      } : null
    });
  }, [isOpen, status, computedIndices, selectedIndices, hasResults, isLoading, hasFailed, colorSchemeType, geoJSON]);

  // Don't automatically close the panel, let the Layout component handle it
  useEffect(() => {
    if (isOpen && hasResults) {
      // Only set default index if this is the first time results are available
      if (selectedIndices.length === 0 && computedIndices.includes('Richness') && !hasUserInteracted.current) {
        console.log('Setting default index to Richness in VisualizationPanel');
        dispatch(setSelectedIndices(['Richness']));
        hasUserInteracted.current = true;  // Mark that we've done the initial selection
      }
    }
  }, [isOpen, hasResults, selectedIndices, computedIndices, dispatch]);

  // Add ref to track if user has interacted with index selection
  const hasUserInteracted = useRef(false);

  // Handle index selection
  const handleIndicesChange = (event) => {
    const value = event.target.value;
    // Allow empty selection and limit to max 2 indices
    if (value.length <= 2) {
      hasUserInteracted.current = true;  // Mark that user has made a selection
      dispatch(setSelectedIndices(value));
    }
  };

  // Get index metadata from diversityIndices vocabulary
  const getIndexMetadata = (indexId) => {
    return diversityIndices.groups
      .flatMap(group => group.indices)
      .find(index => index.commandName === indexId);
  };

  // Handle color palette change
  const handleColorPaletteChange = (event) => {
    dispatch(setColorPalette(event.target.value));
  };

  // Get available palettes for current data type
  const getAvailablePalettes = () => {
    if (!colorSchemeType) return [];
    return getPalettesForType(colorSchemeType);
  };

  // Render color palette selection
  const renderColorPaletteSelection = () => {
    const availablePalettes = getAvailablePalettes();
    const isDivergingType = colorSchemeType === 'diverging';

    if (selectedIndices.length !== 1) {
      return (
        <Typography variant="caption" color="text.secondary">
          Select one index to customize the color palette
        </Typography>
      );
    }

    if (isDivergingType) {
      return (
        <Typography variant="caption" color="text.secondary">
          Color palette is fixed for SES values to ensure consistent interpretation
        </Typography>
      );
    }

    return (
      <Select
        value={colorPalette}
        onChange={handleColorPaletteChange}
        fullWidth
      >
        {availablePalettes.map(palette => (
          <MenuItem key={palette.id} value={palette.id}>
            {palette.name}
          </MenuItem>
        ))}
      </Select>
    );
  };

  // Calculate min/max values for the selected index
  const getValueRangeForIndex = (indexName) => {
    if (!geoJSON?.features?.length || !indexName) {
      console.log('No GeoJSON data or index name:', { 
        hasFeatures: geoJSON?.features?.length > 0, 
        indexName 
      });
      return null;
    }
    
    console.log('Getting value range for index:', indexName);
    console.log('GeoJSON features count:', geoJSON.features.length);
    console.log('First feature properties:', geoJSON.features[0]?.properties);
    
    const values = geoJSON.features
      .map(f => f.properties[indexName])
      .filter(v => typeof v === 'number' && !isNaN(v) && v !== null);
    
    if (values.length === 0) {
      console.log('No valid values found for index:', indexName);
      return null;
    }
    
    const range = [Math.min(...values), Math.max(...values)];
    console.log('Calculated range for', indexName, ':', range);
    return range;
  };

  // Initialize value ranges when GeoJSON data is loaded
  useEffect(() => {
    if (geoJSON?.features?.length > 0 && selectedIndices.length === 1) {
      console.log('Initializing value range for index:', selectedIndices[0]);
      const newRange = getValueRangeForIndex(selectedIndices[0]);
      if (newRange) {
        console.log('Setting initial value range:', newRange);
        dispatch(setValueRange(newRange));
      }
    }
  }, [geoJSON, selectedIndices, dispatch]);

  // Render index selection menu items
  const renderIndexMenuItems = () => {
    return diversityIndices.groups.map((group) => [
      <ListSubheader key={group.id}>
        <Typography variant="subtitle2">{group.name}</Typography>
      </ListSubheader>,
      ...group.indices
        .filter(index => computedIndices.includes(index.commandName))
        .map((index) => (
          <MenuItem 
            key={index.id} 
            value={index.commandName}
            disabled={selectedIndices.length >= 2 && !selectedIndices.includes(index.commandName)}
          >
            <FormControlLabel
              control={
                <Checkbox 
                  checked={selectedIndices.includes(index.commandName)}
                />
              }
              label={
                <Box>
                  <Typography variant="body2">{index.displayName}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {index.description}
                  </Typography>
                </Box>
              }
            />
          </MenuItem>
        ))
    ]);
  };

  // Handle quantile toggle
  const handleQuantileToggle = (event) => {
    dispatch(setUseQuantiles(event.target.checked));
  };

  // Handle value range change
  const handleValueRangeChange = (event, newValue) => {
    dispatch(setValueRange(newValue));
  };

  // Handle minimum records change
  const handleMinRecordsChange = (event, newValue) => {
    dispatch(setMinRecords(newValue));
  };

  // Handle map export
  const handleExportMap = () => {
    const map = document.querySelector('.ol-viewport canvas');
    if (map) {
      const link = document.createElement('a');
      link.download = 'map_export.png';
      link.href = map.toDataURL();
      link.click();
    }
  };

  const renderQuantileBins = () => {
    if (!quantileBins) {
      return (
        <Typography variant="caption" color="text.secondary">
          No data available for quantile binning
        </Typography>
      );
    }

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {quantileBins.map((bin, index) => (
          <Typography key={index} variant="caption" color="text.secondary">
            {bin.label}: {bin.range[0].toFixed(2)} to {bin.range[1] === Number.POSITIVE_INFINITY ? '∞' : bin.range[1].toFixed(2)}
          </Typography>
        ))}
      </Box>
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, mt: 4 }}>
          <CircularProgress />
          <Typography variant="h6">Analysis in progress...</Typography>
          <Typography variant="body2" color="text.secondary" align="center">
            Please wait while we process your data. This may take a few minutes.
            The visualization will automatically update when results are ready.
          </Typography>
          <Box sx={{ mt: 2, width: '100%', maxWidth: 300 }}>
            <Typography variant="caption" color="text.secondary" align="center" display="block">
              You can switch back to the Settings panel to review your configuration while waiting.
            </Typography>
          </Box>
        </Box>
      );
    }

    if (hasFailed) {
      return (
        <Box sx={{ p: 3, textAlign: 'center', color: 'error.main' }}>
          <Typography variant="h6">Analysis failed</Typography>
          {error && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {error}
            </Typography>
          )}
          <Button
            variant="outlined"
            color="primary"
            sx={{ mt: 2 }}
            onClick={() => handlePanelOpen('settings')}
          >
            Return to Settings
          </Button>
        </Box>
      );
    }

    if (!hasResults) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">
            No analysis results available. Run an analysis first.
          </Typography>
        </Box>
      );
    }

    return (
      <>
        {/* Index Selection */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Select Indices</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <FormControl fullWidth>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <FormLabel>Diversity indices</FormLabel>
                <Tooltip 
                  title="Select up to two indices to visualize. If two are selected, a swipe comparison will be enabled."
                  placement="right"
                >
                  <IconButton size="small" sx={{ ml: 1 }}>
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <Select
                multiple
                value={selectedIndices}
                onChange={handleIndicesChange}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {selected.map((indexId) => {
                      const index = diversityIndices.groups
                        .flatMap(group => group.indices)
                        .find(index => index.commandName === indexId);
                      return index?.displayName || indexId;
                    }).join(', ')}
                  </Box>
                )}
              >
                {renderIndexMenuItems()}
              </Select>
            </FormControl>
          </AccordionDetails>
        </Accordion>

        {/* Quantile Toggle */}
        <Box sx={{ px: 2, py: 1.5 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={useQuantiles}
                onChange={handleQuantileToggle}
                disabled={selectedIndices.length !== 1}
              />
            }
            label={
              <Box>
                <Typography>Use quantile bins</Typography>
                {selectedIndices.length !== 1 && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    Available only when one index is selected
                  </Typography>
                )}
              </Box>
            }
          />
          {useQuantiles && selectedIndices.length === 1 && (
            <Box sx={{ mt: 1, ml: 4 }}>
              {renderQuantileBins()}
            </Box>
          )}
        </Box>

        {/* Value Range Filter */}
        <Box sx={{ px: 2, py: 1.5 }}>
          <FormLabel>
            Value range filter
            {selectedIndices.length === 2 && (
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                (Disabled when comparing two indices)
              </Typography>
            )}
          </FormLabel>
          {selectedIndices.length === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
              {(() => {
                const range = getValueRangeForIndex(selectedIndices[0]);
                console.log('Current range for slider:', range);
                return range ? (
                  <>
                    <Slider
                      value={valueRange || range}
                      onChange={handleValueRangeChange}
                      valueLabelDisplay="auto"
                      min={range[0]}
                      max={range[1]}
                      step={(range[1] - range[0]) / 100}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption">{range[0].toFixed(2)}</Typography>
                      <Typography variant="caption">{range[1].toFixed(2)}</Typography>
                    </Box>
                  </>
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    No data available for the selected index
                  </Typography>
                );
              })()}
            </Box>
          )}
          {selectedIndices.length === 2 && (
            <Slider
              disabled
              value={[0, 100]}
              valueLabelDisplay="off"
            />
          )}
          {selectedIndices.length === 0 && (
            <Slider
              disabled
              value={[0, 100]}
              valueLabelDisplay="off"
            />
          )}
        </Box>

        {/* Minimum Records Filter */}
        <Box sx={{ px: 2, py: 1.5 }}>
          <FormLabel>Minimum records per cell</FormLabel>
          <Box sx={{ mt: 1 }}>
            <Slider
              value={minRecords}
              onChange={handleMinRecordsChange}
              min={0}
              max={100}
              valueLabelDisplay="auto"
            />
          </Box>
        </Box>

        {/* Visualization Options */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Display Options</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Color Palette Selection */}
              <FormControl fullWidth>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <FormLabel>Color palette</FormLabel>
                  <Tooltip 
                    title={
                      colorSchemeType === 'diverging' 
                        ? "SES values use a fixed diverging color scheme (red-blue) for consistent interpretation"
                        : "Select a color scheme for visualizing the data"
                    }
                    placement="right"
                  >
                    <IconButton size="small" sx={{ ml: 1 }}>
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                {renderColorPaletteSelection()}
              </FormControl>
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Export Options */}
        <Box sx={{ mt: 2 }}>
          <Button
            variant="contained"
            startIcon={<FileDownloadIcon />}
            onClick={handleExportMap}
            fullWidth
          >
            Export Map
          </Button>
        </Box>
      </>
    );
  };

  return (
    <Drawer
      variant="persistent"
      anchor="left"
      open={isOpen}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: isCollapsed ? 0 : drawerWidth,
          boxSizing: 'border-box',
          position: 'fixed',
          height: '100%',
          border: 'none',
          borderRight: '1px solid rgba(0, 0, 0, 0.12)',
          top: 0,
          transition: 'width 0.2s ease-in-out',
          overflow: 'hidden',
          zIndex: 1001,
          display: 'flex',
          flexDirection: 'column',
          paddingTop: '64px'
        },
      }}
    >
      <Box 
        sx={{ 
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundColor: 'background.paper',
        }}
      >
        <Box
          sx={{
            p: 2,
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            scrollbarWidth: 'thin',
            scrollbarColor: '#888 #f1f1f1',
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: '#f1f1f1',
            },
            '&::-webkit-scrollbar-thumb': {
              background: '#888',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: '#555',
            },
            '& .MuiAccordion-root': {
              '&:not(:last-child)': {
                marginBottom: 2,
              },
              '&:before': {
                display: 'none',
              },
            },
            '& .MuiAccordionSummary-root': {
              minHeight: 48,
              '&.Mui-expanded': {
                minHeight: 48,
              },
            },
            '& .MuiAccordionSummary-content': {
              margin: '12px 0',
              '&.Mui-expanded': {
                margin: '12px 0',
              },
            },
            '& .MuiAccordionDetails-root': {
              padding: '8px 16px 16px',
            },
          }}
        >
          {renderContent()}
        </Box>
      </Box>
    </Drawer>
  );
};

export default VisualizationPanel; 