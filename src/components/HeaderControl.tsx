import React from "react";

interface Props {
  headers: Record<string, string>;
  onChange: (headers: Record<string, string>) => void;
}

const HeaderControl: React.FC<Props> = ({ headers }) => {
  return (
    <>
      {Object.entries(headers).length > 0 && (
        <>
          <table>
            <tbody>
              {Object.keys(headers).map((key) => (
                <tr key={key}>
                  <th>{key}</th>
                  <td>{headers[key]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </>
  );
};

export default HeaderControl;
