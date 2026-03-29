/**
 * Book jackets should show the full cover (letterboxing), not crop like object-fit: cover.
 * Use with MUI Avatar when src is a book cover URL.
 */
export const bookCoverAvatarSx = (sizeSx) => ({
  bgcolor: 'action.hover',
  '& .MuiAvatar-img': {
    objectFit: 'contain',
  },
  ...sizeSx,
});

/**
 * Use with Box component="img" or CardMedia component="img" for book covers.
 */
export const bookCoverImgSx = (sizeSx) => ({
  objectFit: 'contain',
  bgcolor: 'action.hover',
  ...sizeSx,
});
